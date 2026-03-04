import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { pageTransition } from '../animations/animations';
import * as THREE from 'three';

export default function ARScan() {
    const setScreen = useStore((s) => s.setScreen);
    const setSheet = useStore((s) => s.setSheet);
    const [arSupported, setArSupported] = useState(null); // null = checking, true = supported, false = unsupported
    const [sessionStarted, setSessionStarted] = useState(false);

    const [points, setPoints] = useState([]);
    const [editLength, setEditLength] = useState('');
    const [editWidth, setEditWidth] = useState('');
    const [edgeMargin, setEdgeMargin] = useState('5');
    const [kerf, setKerf] = useState('2');
    const [shape, setShape] = useState('rectangle');

    const overlayRef = useRef(null);
    const rendererRef = useRef(null);
    const sessionRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const reticleRef = useRef(null);
    const hitTestSourceRef = useRef(null);
    const hitTestSourceRequestedRef = useRef(false);
    const pointsRef = useRef([]); // holds 3D Vector3 points
    const linesRef = useRef([]);

    // 1. Check for WebXR AR support
    useEffect(() => {
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
                setArSupported(supported);
            });
        } else {
            setArSupported(false);
        }
    }, []);

    // 2. Setup Three.js scene (only when started)
    const startAR = async () => {
        if (!overlayRef.current) return;

        try {
            const sessionInit = {
                requiredFeatures: ['hit-test', 'dom-overlay'],
                domOverlay: { root: overlayRef.current }
            };
            const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
            sessionRef.current = session;

            const scene = new THREE.Scene();
            sceneRef.current = scene;

            const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
            cameraRef.current = camera;

            const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
            light.position.set(0.5, 1, 0.25);
            scene.add(light);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            rendererRef.current = renderer;
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.xr.enabled = true;
            renderer.xr.setReferenceSpaceType('local');
            await renderer.xr.setSession(session);

            document.body.appendChild(renderer.domElement);
            renderer.domElement.style.position = 'absolute';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.zIndex = '-1';

            // Create Reticle
            const ringGeo = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
            const material = new THREE.MeshBasicMaterial({ color: 0x3fb8a0 });
            const reticle = new THREE.Mesh(ringGeo, material);
            reticle.matrixAutoUpdate = false;
            reticle.visible = false;
            scene.add(reticle);
            reticleRef.current = reticle;

            setSessionStarted(true);

            // Render loop
            renderer.setAnimationLoop((timestamp, frame) => {
                if (!frame) return;

                const referenceSpace = renderer.xr.getReferenceSpace();
                const session = renderer.xr.getSession();

                if (!hitTestSourceRequestedRef.current) {
                    session.requestReferenceSpace('viewer').then((viewerSpace) => {
                        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                            hitTestSourceRef.current = source;
                        });
                    });
                    session.addEventListener('end', () => {
                        hitTestSourceRequestedRef.current = false;
                        hitTestSourceRef.current = null;
                        setSessionStarted(false);
                    });
                    hitTestSourceRequestedRef.current = true;
                }

                if (hitTestSourceRef.current) {
                    const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
                    if (hitTestResults.length > 0) {
                        const hit = hitTestResults[0];
                        const pose = hit.getPose(referenceSpace);
                        reticle.visible = true;
                        reticle.matrix.fromArray(pose.transform.matrix);
                    } else {
                        reticle.visible = false;
                    }
                }

                renderer.render(scene, camera);
            });

            session.addEventListener('end', cleanupAR);
        } catch (err) {
            console.error('Failed to start AR:', err);
            cleanupAR();
            setArSupported(false); // fallback if it fails
        }
    };

    const cleanupAR = () => {
        if (rendererRef.current) {
            rendererRef.current.setAnimationLoop(null);
            if (rendererRef.current.domElement.parentNode) {
                rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
            }
            rendererRef.current.dispose();
            rendererRef.current = null;
        }
        setSessionStarted(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sessionRef.current && sessionStarted) {
                sessionRef.current.end().catch(console.error);
            }
            cleanupAR();
        };
    }, [sessionStarted]);

    const handlePlacePoint = () => {
        if (!reticleRef.current || !reticleRef.current.visible || points.length >= 4) return;

        const position = new THREE.Vector3();
        position.setFromMatrixPosition(reticleRef.current.matrix);

        // Add a visual dot
        const geometry = new THREE.SphereGeometry(0.02, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x3fb8a0 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sceneRef.current.add(sphere);

        const newPoints = [...pointsRef.current, position];
        pointsRef.current = newPoints;
        setPoints(newPoints); // trigger react render

        // Draw line if we have a previous point
        if (newPoints.length > 1) {
            const lastPos = newPoints[newPoints.length - 2];
            const lineGeo = new THREE.BufferGeometry().setFromPoints([lastPos, position]);
            const lineMat = new THREE.LineDashedMaterial({ color: 0x3fb8a0, dashSize: 0.05, gapSize: 0.02 });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            sceneRef.current.add(line);
            linesRef.current.push(line);
        }

        // Close shape on 4th point
        if (newPoints.length === 4) {
            const firstPos = newPoints[0];
            const lineGeo = new THREE.BufferGeometry().setFromPoints([position, firstPos]);
            const lineMat = new THREE.LineDashedMaterial({ color: 0x3fb8a0, dashSize: 0.05, gapSize: 0.02 });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            sceneRef.current.add(line);
            linesRef.current.push(line);

            // Calculate dimensions in meters, convert to mm
            const wMeters = newPoints[0].distanceTo(newPoints[1]);
            const hMeters = newPoints[1].distanceTo(newPoints[2]);
            setEditLength(Math.round(wMeters * 1000).toString());
            setEditWidth(Math.round(hMeters * 1000).toString());
        }
    };

    const handleUndo = () => {
        if (pointsRef.current.length === 0) return;

        const removedPoint = pointsRef.current.pop();
        setPoints([...pointsRef.current]);

        // Remove sphere (last added child that is a sphere)
        const spheres = sceneRef.current.children.filter(c => c.geometry instanceof THREE.SphereGeometry);
        if (spheres.length > 0) {
            const lastSphere = spheres[spheres.length - 1];
            sceneRef.current.remove(lastSphere);
            lastSphere.geometry.dispose();
            lastSphere.material.dispose();
        }

        // Remove line(s)
        if (linesRef.current.length > 0) {
            // if we had 4 points, the 4th click added *two* lines (to prev and to start). 
            // We just pop the last line added for the segment. 
            // Actually, if we were at 4 and undo to 3, we must remove the last 2 lines.
            const linesToRemove = removedPoint === 4 ? 2 : 1;
            for (let i = 0; i < linesToRemove && linesRef.current.length > 0; i++) {
                const lastLine = linesRef.current.pop();
                sceneRef.current.remove(lastLine);
                lastLine.geometry.dispose();
                lastLine.material.dispose();
            }
        }
    };

    const handleClear = () => {
        pointsRef.current = [];
        setPoints([]);
        setEditLength('');
        setEditWidth('');

        if (sceneRef.current) {
            const toRemove = sceneRef.current.children.filter(c =>
                c.geometry instanceof THREE.SphereGeometry || c.geometry instanceof THREE.BufferGeometry
            );
            toRemove.forEach(obj => {
                if (obj !== reticleRef.current) { // don't remove reticle
                    sceneRef.current.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                }
            });
        }
        linesRef.current = [];
    };

    const handleConfirm = () => {
        const l = Number(editLength);
        const w = shape === 'square' ? l : Number(editWidth);
        if (l > 0 && w > 0) {
            setSheet({
                length: l.toString(),
                width: w.toString(),
                shape,
                edgeMargin: Number(edgeMargin) || 5,
                kerf: Number(kerf) || 2,
            });
            if (sessionRef.current) {
                sessionRef.current.end().catch(console.error);
            }
            setScreen('circleConfig');
        }
    };

    // ----------------------------------------------------
    // FALLBACK UI for iOS / non-supported devices
    // ----------------------------------------------------
    if (arSupported === false) {
        return (
            <motion.div className="h-screen flex flex-col items-center justify-center p-6 bg-ocean-950" variants={pageTransition} initial="initial" animate="animate" exit="exit">
                <div className="w-16 h-16 rounded-full bg-ocean-800 flex items-center justify-center mb-6">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8a838" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-text-primary mb-2 text-center">True AR Not Supported</h1>
                <p className="text-sm text-text-secondary text-center mb-8 max-w-xs">
                    True 3D floor tracking requires an Android device with Chrome (WebXR). For this device, please enter the dimensions manually.
                </p>

                <button
                    onClick={() => setScreen('manualEntry')}
                    className="w-full max-w-xs py-4 rounded-xl bg-buoy text-white font-bold text-base mb-4 hover:bg-buoy/90"
                >
                    Enter Dimensions Manually →
                </button>
                <button
                    onClick={() => setScreen('home')}
                    className="text-text-secondary hover:text-text-primary text-sm py-2"
                >
                    ← Back to Home
                </button>
            </motion.div>
        );
    }

    // ----------------------------------------------------
    // START AR SCREEN (before session starts)
    // ----------------------------------------------------
    if (arSupported === true && !sessionStarted) {
        return (
            <motion.div className="h-screen flex flex-col items-center justify-center p-6 bg-ocean-950" variants={pageTransition} initial="initial" animate="animate" exit="exit">
                {/* Visual context */}
                <div className="relative w-48 h-48 mb-8">
                    <div className="absolute inset-0 bg-teal/10 rounded-full animate-pulse" />
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        <path d="M20 20 L80 30 L70 90 L10 80 Z" fill="none" stroke="#3fb8a0" strokeWidth="1" strokeDasharray="2 2" />
                        <circle cx="20" cy="20" r="3" fill="#3fb8a0" />
                        <circle cx="80" cy="30" r="3" fill="#3fb8a0" />
                    </svg>
                </div>

                <h1 className="text-xl font-bold text-text-primary mb-2 text-center">True 3D AR Ready</h1>
                <p className="text-sm text-text-secondary text-center mb-8 max-w-xs">
                    This will stick points directly to your floor in real 3D space, meaning you can walk freely around large sheets.
                </p>

                <div ref={overlayRef} className="hidden" /> {/* Temp hidden overlay root for request */}

                <button
                    onClick={startAR}
                    className="w-full max-w-xs py-4 rounded-xl bg-teal text-ocean-950 font-bold text-base mb-4 hover:bg-teal/90"
                >
                    Start 3D AR Scan
                </button>
                <button
                    onClick={() => setScreen('home')}
                    className="text-text-secondary hover:text-text-primary text-sm py-2"
                >
                    ← Back
                </button>
            </motion.div>
        );
    }

    // ----------------------------------------------------
    // ACTIVE AR DOM OVERLAY (WebXR Session)
    // ----------------------------------------------------
    return (
        <div ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 999 }}>
            {/* The transparent WebXR UI */}
            <div className="absolute flex flex-col w-full h-full pointer-events-none">

                {/* Top Bar */}
                <div className="flex items-center justify-between px-3 py-3 bg-gunmetal/80 backdrop-blur-md pointer-events-auto">
                    <button
                        onClick={() => {
                            if (sessionRef.current) sessionRef.current.end();
                            setScreen('home');
                        }}
                        className="text-text-secondary active:text-text-primary px-2 py-1 text-sm font-medium"
                    >
                        ← Exit AR
                    </button>
                    <div className="px-2 py-1 rounded bg-teal/20 text-teal text-xs mono-num border border-teal/30">
                        Point {points.length} / 4
                    </div>
                </div>

                <div className="flex-1" />

                {/* Bottom UI Panel */}
                <div className="bg-gunmetal/90 backdrop-blur-md border-t border-border rounded-t-3xl p-5 pointer-events-auto shadow-[0_-10px_40px_rgba(10,21,32,0.5)]">

                    {points.length < 4 ? (
                        <>
                            <div className="text-center mb-4">
                                <p className="text-sm text-text-primary">Aim at the floor and place points</p>
                                <p className="text-xs text-text-secondary mt-1">Walk around the sheet if needed</p>
                            </div>

                            <button
                                onClick={handlePlacePoint}
                                className="w-full py-4 rounded-xl bg-teal text-ocean-950 font-bold text-base mb-3 active:scale-[0.97] transition-transform shadow-[0_0_20px_rgba(63,184,160,0.3)]"
                                style={{ minHeight: 56 }}
                            >
                                ✓ Place Point {points.length + 1}
                            </button>

                            <div className="flex justify-between items-center px-2">
                                {points.length > 0 ? (
                                    <button onClick={handleUndo} className="flex items-center gap-1.5 text-sm text-amber active:scale-95 py-2">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8h8M4 8l3-3M4 8l3 3" /></svg>
                                        Undo
                                    </button>
                                ) : <div />}

                                {points.length > 0 && (
                                    <button onClick={handleClear} className="text-sm text-danger/80 active:text-danger py-2">
                                        Clear all
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-teal border-b border-border pb-2">AR Measurement Complete</h3>

                            {/* Shape toggle */}
                            <div className="flex gap-2">
                                {['rectangle', 'square'].map(s => (
                                    <button
                                        key={s}
                                        className={`flex-1 py-2.5 rounded-lg text-sm capitalize transition-all ${shape === s ? 'bg-teal/20 text-teal border border-teal/30' : 'bg-ocean-800 text-text-secondary border border-border'}`}
                                        onClick={() => setShape(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-text-dim mb-1 block">Length (mm)</label>
                                    <input type="number" value={editLength} onChange={(e) => setEditLength(e.target.value)}
                                        className="w-full bg-ocean-800 border-border border rounded-lg px-3 py-3 text-sm mono-num text-text-primary focus:outline-none focus:border-teal"
                                        style={{ minHeight: 48 }} />
                                </div>
                                {shape === 'rectangle' && (
                                    <div className="flex-1">
                                        <label className="text-xs text-text-dim mb-1 block">Width (mm)</label>
                                        <input type="number" value={editWidth} onChange={(e) => setEditWidth(e.target.value)}
                                            className="w-full bg-ocean-800 border-border border rounded-lg px-3 py-3 text-sm mono-num text-text-primary focus:outline-none focus:border-teal"
                                            style={{ minHeight: 48 }} />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-text-dim mb-1 block">Edge Margin (mm)</label>
                                    <input type="number" value={edgeMargin} onChange={(e) => setEdgeMargin(e.target.value)}
                                        className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-2 text-sm mono-num text-text-primary" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-text-dim mb-1 block">Kerf (mm)</label>
                                    <input type="number" value={kerf} onChange={(e) => setKerf(e.target.value)}
                                        className="w-full bg-ocean-800 border border-border rounded-lg px-3 py-2 text-sm mono-num text-text-primary" />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={handleClear} className="px-4 py-3 rounded-xl border border-border text-text-secondary active:text-text-primary" style={{ minHeight: 48 }}>
                                    ↩ Remeasure
                                </button>
                                <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-buoy text-white font-bold active:bg-buoy/90" style={{ minHeight: 48 }}>
                                    Confirm →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

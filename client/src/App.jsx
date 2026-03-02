import { AnimatePresence } from 'framer-motion';
import { useStore } from './store/store';
import Home from './screens/Home';
import ARScan from './screens/ARScan';
import ManualEntry from './screens/ManualEntry';
import CircleConfig from './screens/CircleConfig';
import Results from './screens/Results';

const screens = {
  home: Home,
  arScan: ARScan,
  manualEntry: ManualEntry,
  circleConfig: CircleConfig,
  results: Results,
};

export default function App() {
  const currentScreen = useStore((s) => s.currentScreen);
  const Screen = screens[currentScreen] || Home;

  return (
    <div className="h-full blueprint-bg noise-overlay">
      <AnimatePresence mode="wait">
        <Screen key={currentScreen} />
      </AnimatePresence>
    </div>
  );
}

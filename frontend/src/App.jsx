import AppRoutes from "./routes/AppRoutes";
import PwaUpdatePrompt from "./components/common/PwaUpdatePrompt";
import PushPermissionPrompt from "./components/common/PushPermissionPrompt";
import DiwaliTheme from "./components/festival/DiwaliTheme";

function App() {
  return <>
    <AppRoutes />
    <DiwaliTheme />
    <PwaUpdatePrompt />
    <PushPermissionPrompt />
  </>;
}

export default App;

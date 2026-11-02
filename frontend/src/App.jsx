import AppRoutes from "./routes/AppRoutes";
import PushPermissionPrompt from "./components/common/PushPermissionPrompt";
import DiwaliTheme from "./components/festival/DiwaliTheme";

function App() {
  return <>
    <AppRoutes />
    <DiwaliTheme />
    <PushPermissionPrompt />
  </>;
}

export default App;

import AppRoutes from "./routes/AppRoutes";
import PwaUpdatePrompt from "./components/common/PwaUpdatePrompt";
import PushPermissionPrompt from "./components/common/PushPermissionPrompt";

function App() {
  return <>
    <AppRoutes />
    <PwaUpdatePrompt />
    <PushPermissionPrompt />
  </>;
}

export default App;

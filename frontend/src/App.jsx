import AppRoutes from "./routes/AppRoutes";
import PushPermissionPrompt from "./components/common/PushPermissionPrompt";

function App() {
  return <>
    <AppRoutes />
    <PushPermissionPrompt />
  </>;
}

export default App;

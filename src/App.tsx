import { LandingPage } from "./pages/Landing";
import { AdminPage } from "./pages/Admin";

function App() {
	const path = window.location.pathname.replace(/\/+$/, "") || "/";
	if (path === "/admin" || path.startsWith("/admin/")) {
		return <AdminPage />;
	}
	return <LandingPage />;
}

export default App;

import { LandingPage } from "./pages/Landing";
import { AdminPage } from "./pages/Admin";
import { SystemsPage } from "./pages/Systems";
import { WorkPage } from "./pages/Work";
import { EcosystemPage } from "./pages/Ecosystem";

function App() {
	const path = window.location.pathname.replace(/\/+$/, "") || "/";
	if (path === "/admin" || path.startsWith("/admin/")) {
		return (
			<div className="admin-shell">
				<AdminPage />
			</div>
		);
	}
	if (path === "/systems") {
		return <SystemsPage />;
	}
	if (path === "/ecosystem") {
		return <EcosystemPage />;
	}
	if (path.startsWith("/work/")) {
		return <WorkPage slug={path.slice("/work/".length)} />;
	}
	return <LandingPage />;
}

export default App;

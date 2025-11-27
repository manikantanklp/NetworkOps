import { Link, useLocation } from "react-router-dom";
import './Sidebar.css';

export default function Sidebar() {
    const location = useLocation();

    const links = [
        { name: "Dashboard", path: "/" },
        { name: "Inventory", path: "/inventory" },
        { name: "Discovery", path: "/discover" },
        { name: "Push Config", path: "/config" },
        { name: "Tickets", path: "/tickets" },  
        { name: "Analytics", path: "/analytics" },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">NetworkOps</div>
            <nav className="sidebar-nav">
                {links.map((link) => (
                    <Link
                        key={link.name}
                        to={link.path}
                        className={location.pathname === link.path ? "active" : ""}
                    >
                        {link.name}
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">© 2025 NetworkOps</div>
        </aside>
    );
}

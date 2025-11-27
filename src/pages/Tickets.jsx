import React, { useEffect, useState } from "react";

function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/tickets") // 🔥 correct backend port
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTickets(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load tickets");
        setLoading(false);
      });
  }, []);

  if (loading) return <h2>Loading tickets...</h2>;
  if (error) return <h3 style={{ color: "red" }}>⚠ {error}</h3>;

  return (
    <div>
      <h2>🚨 Ticket Dashboard</h2>
      <p>Total Tickets: <strong>{tickets.length}</strong></p>

      <table border="1" width="100%" style={{ textAlign: "left" }}>
        <thead>
          <tr>
            <th>Number</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Category</th>
            <th>State</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, index) => (
            <tr key={index}>
              <td>{ticket.number}</td>
              <td>{ticket.short_description}</td>
              <td>{ticket.priority}</td>
              <td>{ticket.category}</td>
              <td>{ticket.state}</td>
              <td>{ticket.sys_created_on}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Tickets;

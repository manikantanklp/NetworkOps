import React, { useEffect, useState } from "react";

function TicketCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/tickets")
      .then(res => res.json())
      .then(data => setCount(data.length));
  }, []);

  return (
    <div>
      <h3>Total Tickets: <strong>{count}</strong></h3>
      <a href="/tickets">View Details →</a>
    </div>
  );
}

export default TicketCount;

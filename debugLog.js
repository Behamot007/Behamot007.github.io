const logEl = document.getElementById('log');

function log(msg) {
  console.log(msg);
  const message = document.createElement("p");
  message.innerText = msg + "\n";

  logEl.appendChild(message);
  logEl.scrollTop = logEl.scrollHeight;
}
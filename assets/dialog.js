/* Starzey confirm dialog — a themed in-app replacement for the native
 * confirm() popup. Usage:
 *
 *   StarzeyDialog.confirm({
 *     title: "Delete this link?",
 *     message: "This can't be undone.",
 *     confirmText: "Delete",
 *     danger: true
 *   }).then(function (ok) { if (ok) ... });
 */
(function (global) {
  "use strict";

  function confirmDialog(opts) {
    opts = opts || {};

    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "dialog-overlay";

      var card = document.createElement("div");
      card.className = "dialog-card";
      card.setAttribute("role", "alertdialog");
      card.setAttribute("aria-modal", "true");

      var title = document.createElement("h3");
      title.className = "dialog-title";
      title.textContent = opts.title || "Are you sure?";

      var message = document.createElement("p");
      message.className = "dialog-message";
      message.textContent = opts.message || "";

      var actions = document.createElement("div");
      actions.className = "dialog-actions";

      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-ghost";
      cancelBtn.textContent = opts.cancelText || "Cancel";

      var confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "btn " + (opts.danger ? "btn-danger" : "btn-primary");
      confirmBtn.textContent = opts.confirmText || "Confirm";

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      card.appendChild(title);
      card.appendChild(message);
      card.appendChild(actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      var closed = false;

      function close(result) {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        overlay.classList.remove("open");
        setTimeout(function () { overlay.remove(); }, 180);
        resolve(result);
      }

      function onKey(e) {
        if (e.key === "Escape") close(false);
      }

      cancelBtn.addEventListener("click", function () { close(false); });
      confirmBtn.addEventListener("click", function () { close(true); });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close(false);
      });
      document.addEventListener("keydown", onKey);

      requestAnimationFrame(function () {
        overlay.classList.add("open");
        cancelBtn.focus();
      });
    });
  }

  global.StarzeyDialog = { confirm: confirmDialog };
})(window);

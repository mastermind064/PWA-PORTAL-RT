const AlertDismissible = ({ type = "danger", message, onClose, className = "" }) => {
  if (!message) return null;
  return (
    <div className={`alert alert-${type} alert-dismissible ${className}`} role="alert">
      {message}
      <button
        type="button"
        className="btn-close"
        aria-label="Close"
        onClick={onClose}
      />
    </div>
  );
};

export default AlertDismissible;

import React, { useEffect } from 'react';

const Notification = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-gradient-to-br from-green-500 to-green-600',
    error: 'bg-gradient-to-br from-red-500 to-red-600',
    info: 'bg-gradient-to-br from-brand-blue to-brand-blue-700'
  };

  return (
    <div
      className={`fixed top-5 right-5 px-5 py-4 rounded-lg text-white font-semibold z-50 max-w-xs shadow-2xl animate-slideIn ${bgColors[type]}`}
    >
      {message}
    </div>
  );
};

export default Notification;


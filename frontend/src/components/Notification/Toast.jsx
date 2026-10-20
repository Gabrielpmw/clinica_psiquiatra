import React from 'react';
import { useNotification } from '../../context/NotificationContext';

export default function Toast() {
  // O container de toasts já é renderizado via NotificationProvider.
  // Este componente existe para compatibilidade modular.
  return null;
}

export { useNotification };

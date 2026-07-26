import React from 'react';

export function EditorToast({ message }) {
  return message ? <div className="toast">✓ {message}</div> : null;
}

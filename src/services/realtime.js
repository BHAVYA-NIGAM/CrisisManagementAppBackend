let ioRef;

export const bindIo = (io) => {
  ioRef = io;
};

export const emitEvent = (event, payload) => {
  if (ioRef) ioRef.emit(event, payload);
};

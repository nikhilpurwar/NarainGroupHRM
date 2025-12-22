let io = null;

export const setIO = (serverIo) => {
  io = serverIo;
};

export const getIO = () => io;

export default { setIO, getIO };

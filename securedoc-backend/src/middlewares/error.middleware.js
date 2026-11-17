const errorMiddleware = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`
    });
  }
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'A record with this value already exists.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found.' });
    }
  }
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorMiddleware;

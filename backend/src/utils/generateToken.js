import jwt from 'jsonwebtoken';

export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'super_secret_enterprise_jwt_key_2026_secure';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ id: userId }, secret, {
    expiresIn,
  });
};

export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'super_secret_enterprise_jwt_key_2026_secure';
  return jwt.verify(token, secret);
};

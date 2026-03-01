import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import rentalRoutes from './routes/rentalRoutes';
import lessonRoutes from './routes/lessonRoutes';
import resortRoutes from './routes/resortRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: '스노우프라이스 API 서버입니다.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/resorts', resortRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`🎿 스노우프라이스 서버가 포트 ${PORT}에서 실행중입니다.`);
});

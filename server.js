const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 路由
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const statisticsRoutes = require('./routes/statistics');

app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/statistics', statisticsRoutes);

// 根路径
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`考勤系统服务器运行在端口 ${PORT}`);
});
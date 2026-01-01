import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await connection.execute('DROP TABLE IF EXISTS template_usage');
  console.log('Dropped template_usage');
  await connection.execute('DROP TABLE IF EXISTS template_favorites');
  console.log('Dropped template_favorites');
  await connection.execute('DROP TABLE IF EXISTS custom_templates');
  console.log('Dropped custom_templates');
} finally {
  await connection.end();
}

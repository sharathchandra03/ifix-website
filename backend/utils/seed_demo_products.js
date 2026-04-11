require('dotenv').config();
const mysql = require('mysql2/promise');

const demoProducts = [
  ['Samsung Galaxy M14 (Used)', '6GB RAM, 128GB storage, battery health 90%+', 11999, '', 'phones', 6],
  ['Redmi Note 12 (Used)', '6GB RAM, 128GB, good condition', 10999, '', 'phones', 8],
  ['Vivo T2 (Used)', '8GB RAM, AMOLED display, clean unit', 12999, '', 'phones', 5],
  ['Realme Narzo 60 (Used)', '6GB RAM, 128GB, charger included', 11499, '', 'phones', 7],
  ['OnePlus Nord CE 2 Lite (Used)', '6GB RAM, smooth performance', 13999, '', 'phones', 4],
  ['Dell Inspiron 15 (Refurbished)', 'Intel i5, 8GB RAM, 512GB SSD', 28999, '', 'laptops', 3],
  ['HP 14s (Refurbished)', 'Ryzen 5, 8GB RAM, 512GB SSD', 30999, '', 'laptops', 2],
  ['Lenovo IdeaPad Slim 3 (Refurbished)', 'Intel i3 12th Gen, 8GB RAM', 26999, '', 'laptops', 4],
  ['iPhone 11 (Used)', '64GB, battery health 85%+', 24999, '', 'iphone', 3],
  ['iPhone 12 (Used)', '128GB, Face ID working, clean unit', 33999, '', 'iphone', 2]
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    const names = ['Test Device', ...demoProducts.map(p => p[0])];
    const placeholders = names.map(() => '?').join(', ');
    await connection.query(`DELETE FROM products WHERE name IN (${placeholders})`, names);

    const valuePlaceholders = demoProducts.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = demoProducts.flat();
    await connection.query(
      `INSERT INTO products (name, description, price, image_url, category, stock) VALUES ${valuePlaceholders}`,
      flatValues
    );

    const [rows] = await connection.query(
      'SELECT id, name, category, price, stock FROM products ORDER BY id DESC LIMIT 12'
    );

    console.log('Seed complete. Latest products:');
    console.table(rows);
  } finally {
    await connection.end();
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});

const express = require('express');
const router = express.Router();

const pool = require('../modules/pool');

router.get('/', (req, res) => {
  const sqlText = `
  SELECT "account".name, SUM("register".amount) FROM "register"
  JOIN "account"
  ON "account".id = "register".acct_id
  GROUP BY "account".name;`;

  pool.query(sqlText)
    .then( result => {
      console.log('result:', result.rows);
      res.send(result.rows)
    }).catch( err => {
      console.log(err);
      res.sendStatus(500);
    })
})

router.post('/transfer', async (req, res) => {
  
  const toId = req.body.toId;
  const fromId = req.body.fromId;
  const amount = req.body.amount;

  console.log(`transfering, ${amount}, from account ${fromId}, to account ${toId}` );

  const connection = await pool.connect();

  try{
    await connection.query('BEGIN');
    const sqlText = `
    INSERT INTO "register" ("acct_id", "amount")
    VALUES ($1, $2);`;
    //withdrawl
    await connection.query(sqlText, [fromId, -amount]);
    //deposit
    await connection.query(sqlText, [toId, amount])

    await connection.query('COMMIT');

    res.sendStatus(200);

  } catch (error) {
    await connection.query('ROLLBACK');
    console.log('error sending transaction', error);
    res.sendStatus(500);
  } finally {
    connection.release();
  }
  // const sqlValues = [];

  // pool.query(sqlText, sqlValues)
  //   .then(result => {
  //     console.log('result', result.rows);
  //   }).catch( err => {
  //     console.log(err);
  //     res.sendStatus(500)
  //   })
});

module.exports = router;

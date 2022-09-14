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

router.post('/new', async (req, res) => {
  const name = req.body.name;
  const amount = req.body.amount;

  console.log(`new account for ${name}, with initial balance of ${amount}`);

  const connection = await pool.connect();

  try{
    await connection.query('BEGIN');

    const sqlAddAccount = `
    INSERT INTO "account" ("name")
    VALUES ($1)
    RETURNING "id";`;

    // save query result to variable
    const result = await connection.query(sqlAddAccount, [name]);

    const accountId = result.rows[0].id;

    const sqlAddAmount = `
    INSERT INTO "register" ("acct_id", "amount")
    VALUES ($1, $2);`;
    await connection.query(sqlAddAmount, [accountId, amount]);

    await connection.query('COMMIT');
    res.sendStatus(200);
  } catch (error) {
    await connection.query('ROLLBACK');
    console.log('error in opening account', error);
    res.sendStatus(500);
  } finally {
    connection.release();
  }
})

module.exports = router;

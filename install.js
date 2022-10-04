const sqlite3 = require('sqlite3');

// this is a top-level await 
(async () => {
    // open the database
    const db = new sqlite3.Database("./grouping.db", 
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, 
    (err) => { 
        console.error(err);
    });

    await db.exec(`CREATE TABLE groups (
        id INTEGER PRIMARY KEY,
        label varchar(255)
    );
    `);
    await db.exec(`CREATE TABLE persons (
        id INTEGER PRIMARY KEY,
        group_id int,
        first_name varchar(255),
        last_name varchar(255)
    );
    `);
    await db.exec(`CREATE TABLE tags (
        id INTEGER PRIMARY KEY,
        label varchar(255)
    );
    `);
    await db.exec(`CREATE TABLE group_tags (
        id INTEGER PRIMARY KEY,
        tag_id int not null,
        group_id int not null
    );
    `);
    await db.exec(`CREATE TABLE person_tags (
        id INTEGER PRIMARY KEY,
        tag_id int not null,
        person_id int not null
    );
    `)
})()



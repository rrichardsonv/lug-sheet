const sqlite3 = require('sqlite3');
const csv = require('csv-parser');
const fs = require('fs')
const {open} = require('sqlite');

const HAS_HEADERS = false;
const SEP = ",";

const targetTable = process.argv[2];
const seedfile = process.argv[3];

const toValues = (headerLength, rows) => {
  const tmpl = [...Array(headerLength - 1).keys()];

  return rows.reduce((acc, _) => {
    return [`(NULL, ${tmpl.map(_ => "?").join(", ")})`, ...acc];
  }, []).join(", ")
}

const insPerson = async (db, personRows) => {
  return db.run(
    `INSERT INTO persons (id, first_name, last_name)
    VALUES ${toValues(3, personRows)}
    RETURNING id, first_name, last_name`,
    ...personRows.flat()
  )
};


const insGroup = async (db, groupRows) => {
  return db.run(
    `INSERT INTO groups (id, label) values ${toValues(2, groupRows)}`,
    ...groupRows.flat()
  )
};


const insTag = async (db, tagRows) => {
  return db.run(
    `INSERT INTO tags (id, label) values ${toValues(2, tagRows)}  RETURNING id, label`,
    ...tagRows.flat()
  )
};

const insPersonTag = async (db, ptagRows) => {
  return db.run(
    `INSERT INTO person_tags (id, tag_id, person_id) values ${toValues(3, ptagRows)}`,
    ...ptagRows.flat()
  )
};

const personMulti = async (db, personTagRows) => {
  const [
    personSet,
    tagSet,
    pLookup,
    tLookup
  ] = personTagRows.reduce(([personRows, tagRows, personLookup, tagLookup], [first_name, last_name, tag]) => {
    const key = [first_name, last_name].join(',');
    return [
      personRows.add(key),
      tagRows.add(tag),
      {...personLookup, [key]: null},
      {...tagLookup, [tag]: null}
    ];
  }, [new Set(), new Set(), {}, {}]);
  
  const personR = Array.from(personSet).map(p => p.split(","));
  const personResult = await insPerson(db, personR);
  
  let firstPersonId = (personResult.lastID - personR.length);
  personR.map(params => [++firstPersonId, ...params])
         .forEach(([id, first_name, last_name]) => {
            pLookup[[first_name,last_name].join(',')] = id;
         });

  const tagR = Array.from(tagSet).map(t => [t]);
  const tagResult = await insTag(db, tagR);

  let firstTagId = (tagResult.lastID - tagR.length);
  tagR.map(params => [++firstTagId, ...params])
  .forEach(([id, label]) => {
     tLookup[label] = id;
  });

  const personTagRowsFinal = personTagRows.map(([first_name, last_name, tag]) => [
    tLookup[tag],
    pLookup[[first_name,last_name].join(',')],
  ]);
  console.log(personTagRowsFinal)
  
  return insPersonTag(
    db,
    personTagRowsFinal
  );
}


// this is a top-level await 
(async () => {
    // open the database
    const db = await open({
      filename: "./grouping.db",
      driver: sqlite3.Database
    });

    let inserter = null;
    switch (true) {
      case /trunc/i.test(targetTable):
        await db.run('DELETE FROM person_tags;')
        console.log('cleared person_tags...')
        await db.run('DELETE FROM persons;')
        console.log('cleared persons...')
        await db.run('DELETE FROM groups;')
        console.log('cleared groups...')
        await db.run('DELETE FROM tags;')
        console.log('cleared tags...')
        break;
      case /person_tag/i.test(targetTable):
        inserter = personMulti;
        break;
      case /person/i.test(targetTable):
        inserter = insPerson;
        break;
      case /group/i.test(targetTable):
        inserter = insGroup;
        break;
      case /tag/i.test(targetTable):
        inserter = insTag;
        break;
      default:
        inserter = null;
        break;
    }

    if (!inserter) return;
    const results = [];
    fs.createReadStream(seedfile)
      .pipe(csv({
        headers: HAS_HEADERS,
        separator: SEP,
      }))
      .on('data', (data) => {
        results.push(Object.values(data));
      })
      .on('end', (data) => {
        inserter(
          db,
          results
        ).catch(e => console.error(e));
      })
})()
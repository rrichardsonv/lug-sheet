const path = require('path');
const http = require('http');
const _ = require('lodash');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');


const renderGroup = ({ id, label }, children) => `<vql-group id="${id}" ondragover="handleDragover(event)" ondrop="handleDrop(event)" groupNm="${label}">${children.join('\n')}</vql-group>`
const renderPerson = ({ id, first_name: firstname, last_name: lastname }, children) => `<vql-person id="${id}" draggable="true" firstname="${firstname}" lastname="${lastname}">${children.join('\n')}</vql-person>`
const renderTag = ({id, label}) => `<vql-tag id=${id} slot="tags" txxt="${label}"></vql-tag>`;
const renderPeopleTree = (peeps) => _.map(peeps, ({ tags, ...p }) => renderPerson(p, _.map(tags, renderTag)))
const renderGroupTree = (gruups, gLook) => _.map(gruups, ({ foreign_id, ...g }) => renderGroup(g, renderPeopleTree(gLook[foreign_id])));

// Require the fastify framework and instantiate it
const fastify = require('fastify')({
  // set this to true for detailed logging:
  logger: false
});


// Setup our static files
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/' // optional: default '/'
});

// point-of-view is a templating manager for fastify
fastify.register(require('point-of-view'), {
  engine: {
    handlebars: require('handlebars')
  }
});

// Our main GET home page route, pulls from src/pages/index.hbs
fastify.get('/', async function(request, reply) {
    // open the database
    const db = await open({
      filename: "./grouping.db",
      driver: sqlite3.Database
    });

    const result = await db.all(`
    SELECT
      'person' as type,
      p.id as id,
      p.first_name as first_name,
      p.last_name as last_name,
      NULL as label,
      p.group_id as foreign_id
    FROM
      persons as p
    UNION
    SELECT
      'tag' as type,
      t.id as id,
      NULL as first_name,
      NULL as last_name,
      t.label as label,
      pt.person_id as foreign_id
    FROM
      person_tags as pt
    JOIN
      tags as t on pt.tag_id = t.id
    UNION
    SELECT
      'group' as type,
      g.id as id,
      NULL as first_name,
      NULL as last_name,
      g.label as label,
      NULL as foreign_id
    FROM
      groups as g
    `);

    const fieldLookup = {
      group: ["id", "label"],
      tag: ["id", "label", "foreign_id"],
      person: ["id", "first_name", "last_name", "foreign_id"]
    };

    const grpd = _.groupBy(result, (o) => o["type"]);

    const {
      "group": pickedGroups,
      "tag": pickedTags,
      "person": pickedPersons
    } = _.mapValues(grpd, (gv, gk) => {
      const fieldz = fieldLookup[gk];
      return _.map(gv, (ooo) => _.pick(ooo, fieldz)) 
    });

    const tagLookup = _.groupBy(pickedTags, "foreign_id");

    const {
      groupedP: withGroupP,
      ungroupedP: ungroupedP
    } = {
      groupedP: [],
      ungroupedP: [],
      ..._.groupBy(
    _.map(
      pickedPersons,
      (p) => ({...p, tags: tagLookup[p.id] })
    ),
    (p) => p.foreign_id && /\d+/.test(p.foreign_id) ? "groupedP" : "ungroupedP"
    )
  };

    const groupedP = _.groupBy(withGroupP, "p.foreign_id");

    const mk = [
      ...renderGroupTree(pickedGroups, groupedP),
      ...renderPeopleTree(ungroupedP)
    ].join('\n');



    // request.query.paramName <-- a querystring example
    return reply.view('/src/pages/index.hbs', {
      // rez: JSON.stringify(grpd),
      mk
    });
});

// Run the server and report out to the logs
fastify.listen(3000, function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});


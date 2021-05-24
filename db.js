const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);

const User = conn.define('user', {
  username: STRING,
  password: STRING,
});

User.byToken = async (token) => {
  try {
    const { userId } = jsonwebtoken.verify(token, process.env.JWT);
    const user = await User.findByPk(userId);
    if (user) {
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });

  if (await bcrypt.compare(password, user.password)) {
    return jsonwebtoken.sign(
      {
        userId: user.id,
      },
      process.env.JWT
    );
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user) => {
  const salt = 5; //random number
  user.password = await bcrypt.hash(user.password, salt);
});

const Note = conn.define('note', {
  text: STRING,
});

User.hasMany(Note);
Note.belongsTo(User);

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    {
      username: 'lucy',
      password: 'lucy_pw',
      notes: [{ text: 'AAA' }, { text: 'BBB' }],
    },
    {
      username: 'moe',
      password: 'moe_pw',
      notes: [{ text: 'CCC' }, { text: 'DDD' }],
    },
    { username: 'larry', password: 'larry_pw', notes: [{ text: 'EEE' }, { text: 'FFF' }],},
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential, { include: Note }))
  );
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};

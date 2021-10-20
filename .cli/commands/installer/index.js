/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const { _ } = arcli;

const path = require('path');
const chalk = require('chalk');
const op = require('object-path');
const GENERATOR = require('./generator');
const mod = path.dirname(require.main.filename);
const { message } = require(`${mod}/lib/messenger`);

const NAME = 'installer [name]';
const DESC = 'Install an Actinium or Reactium Plugin';
const CANCELED = 'Action canceled!';

const HELP = () =>
    console.log(`
Example:
  $ arcli installer @atomic-reactor/reactium-ui

For devops purposes you can call:
  $ arcli installer

This will run the arcli-install.js files for testing purposes.
`);

const ACTION = ({ name, opt, props }) => {
    if (name) {
        let [app, tag] = name.split('@');

        if (app === 'actinium' || app === 'reactium') {
            tag = tag || 'latest';
            return arcli.runCommand('arcli', [app, 'install', '-t', tag, '-e']);
        }
    }

    const ovr = FLAGS_TO_PARAMS({ opt });

    const params = { ...ovr, name };
    params.dir = _.compact(['/reactium_modules', name]).join('/');

    return GENERATOR({ params, props })
        .then(() => process.exit())
        .catch(err =>
            message(op.get(err, 'message', op.get(err, 'msg', CANCELED))),
        );
};

const FLAGS = ['save'];

const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            obj[key] = val;
        }

        return obj;
    }, {});

const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((name, opt) => ACTION({ name, opt, props }))
        .option(
            '-s, --save [save]',
            'Install and save dependencies to package.json',
        )
        .on('--help', HELP);

module.exports = {
    COMMAND,
    NAME,
};

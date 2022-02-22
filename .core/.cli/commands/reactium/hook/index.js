arcli.Reactium = require('@atomic-reactor/reactium-sdk-core').default;

const { ActionSequence, ora, path, Reactium } = arcli;

const ENUMS = {
    CANCELED: 'hook canceled!',
    DESC: 'Reactium: Create or replace a component hooks file',
    FLAGS: {
        destination: {
            flag: '-d, --destination [destination]',
            desc: 'Directory to save the file',
        },
        unattended: {
            flag: '-u, --unattended [unattended]',
            desc: 'Bypass the preflight confirmation and any input prompts',
        },
    },
    NAME: 'hook',
};

// prettier-ignore
const HELP = () => console.log(`
Example:
  $ arcli hook -h
`);

const ACTION = async ({ opt, props }) => {
    // load hooks
    arcli
        .globby(
            [
                './.core/**/reactium-arcli.js',
                './src/**/reactium-arcli.js',
                './reactium_modules/**/reactium-arcli.js',
                './node_modules/**/reactium-arcli.js',
            ],
            {
                dot: true,
            },
        )
        .forEach(file => require(path.resolve(file)));

    let params = arcli.flagsToParams({ opt, flags: Object.keys(ENUMS.FLAGS) });

    await Reactium.Hook.run('arcli-hook-init', {
        ...props,
        params,
        ENUMS,
    });

    await Reactium.Hook.run('arcli-hook-enums', {
        ...props,
        params,
        ENUMS,
    });

    if (params.unattended !== true) {
        await Reactium.Hook.run('arcli-hook-input', {
            ...props,
            params,
            ENUMS,
        });
    }

    await Reactium.Hook.run('arcli-hook-conform', {
        ...props,
        params,
        ENUMS,
    });

    if (params.unattended !== true) {
        await Reactium.Hook.run('arcli-hook-preflight', {
            ...props,
            params,
        });

        await Reactium.Hook.run('arcli-hook-confirm', {
            ...props,
            params,
            ENUMS,
        });

        if (params.confirm !== true) {
            arcli.message(ENUMS.CANCELED);
            return;
        }
    }

    console.log('');

    // Start the spinner

    const spinner = ora({ spinner: 'dots', color: 'cyan' });
    spinner.start();

    let actions = {};
    await Reactium.Hook.run('arcli-hook-actions', {
        ...props,
        params,
        actions,
        spinner,
        ENUMS,
    });

    return ActionSequence({
        actions,
        options: { params, props, spinner },
    })
        .then(success => {
            spinner.succeed('complete!');
            console.log('');
            return success;
        })
        .catch(error => {
            spinner.fail('error!');
            console.error(error);
            return error;
        });
};

const COMMAND = ({ program, props }) => {
    program
        .command(ENUMS.NAME)
        .description(ENUMS.DESC)
        .on('--help', HELP)
        .action(opt => ACTION({ opt, props, program }));

    program.commands
        .filter(cmd => Boolean(cmd._name === ENUMS.NAME))
        .forEach(cmd =>
            Object.values(ENUMS.FLAGS).forEach(({ flag, desc }) =>
                cmd.option(flag, desc),
            ),
        );

    return program;
};

module.exports = {
    COMMAND,
    NAME: ENUMS.NAME,
};
import Reactium, { isBrowserWindow } from 'reactium-core/sdk';
import { createStore, combineReducers, compose } from 'redux';
import { applyMiddleware } from 'redux-super-thunk';
import deps, { manifest } from 'dependencies';
import _ from 'underscore';

let store;

/**
 * -----------------------------------------------------------------------------
 * @description Redux setup
 * -----------------------------------------------------------------------------
 */
let localizeState = true;
let initialState = {};
if (isBrowserWindow()) {
    if ('INITIAL_STATE' in window) {
        initialState = window.INITIAL_STATE;
        delete window.INITIAL_STATE;
    }
}

// Make sure initial loaded state matches reducers
const sanitizeInitialState = state =>
    Object.keys(state)
        .filter(s => s in manifest.allReducers)
        .reduce(
            (states, key) => ({
                ...states,
                [key]: state[key],
            }),
            {},
        );

const loadDependencyStack = (dependency, items, isServer) => {
    return Object.keys(dependency).reduce(
        (items, key) => dependency[key](items, isServer),
        items,
    );
};

const noop = cb => {};
const storeCreator = async ({ server = false } = {}) => {
    // Avoid replacing existing store.
    if (store) return store;

    // Load InitialState first from modules
    let importedStates = await deps().loadAllMerged('allInitialStates');

    initialState = {
        ...sanitizeInitialState(importedStates),
        ...initialState,
    };

    let middlewares = loadDependencyStack(
        await deps().loadAllMerged('allMiddleware'),
        [],
        server,
    );

    // Combine all Top-level reducers into one
    let rootReducer = combineReducers(
        await deps().loadAllMerged('allReducers'),
    );

    // add redux enhancers
    let enhancers = _.sortBy(
        loadDependencyStack(
            await deps().loadAllDefaults('allEnhancers'),
            [
                {
                    name: 'applyMiddleware',
                    enhancer: applyMiddleware(
                        ..._.sortBy(middlewares, 'order').map(({ mw }) => mw),
                    ),
                    order: 1000,
                },
            ],
            server,
        ),
        'order',
    ).map(({ enhancer }) => enhancer);

    // Create the store
    store = compose(...enhancers)(createStore)(rootReducer, initialState);

    Reactium.Redux = {
        store,
        allReducers: manifest.allReducers,
        middlewares,
    };

    // Allow plugins the ability to interact with store directly
    await Reactium.Hook.run('store-created', Reactium.Redux);

    return store;
};

Reactium.Hook.register(
    'store-create',
    async (config, context) => {
        context.store = await storeCreator(config);
        console.log('Redux store created.');
        return Promise.resolve();
    },
    Reactium.Enums.priority.highest,
);

'use strict'

/* eslint-env mocha */

require('../src/config/config')

import nconf from 'nconf'

import {SERVER_PORTS} from './constants'

// Set the router http port to the mocked constant value for the tests
nconf.set('router', {httpPort: SERVER_PORTS.httpPort})
// Set the authentication maxAge to 2s for the tests
nconf.set('api', {maxAge: 1000})

# Introduction

In `Evernode`, there are three distinct types of hooks:
- Governor Hook
- Registry Hook
- Heartbeat Hook.

Each of these hooks is associated with a separate Xahau account. Therefore, in various scenarios, it becomes necessary to create client instances to engage with these hooks.

This section aims to enhance your comprehension of the available hook clients in `Evernode`. It will provide you with detailed specifications and guidance on how to utilize them effectively within `Evernode`.

<br/>

# Hook Client Factory

## Description
The Hook Client Factory provides a common interface for creating hook clients. Developers can instantiate hook clients with minimal effort.

## Create a particular Hook Client - `static async create(hookType)`
Creates a hook client from given type.

### Parameters
| Name     | Type   | Description                                                                              |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| hookType | string | Type of the Required Hook. (Supported Hook types 'GOVERNOR', 'REGISTRY' and 'HEARTBEAT') |

### Response format
Instance of requested HookClient type.

### Example
```javascript
// Set the Default configuration.
Defaults.set({
    governorAddress: "rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL"
});

// Instantiate a Governor client for the provided Governor Address via HookClientFactory.
const governorClient = await HookClientFactory.create('GOVERNOR');

// Instantiate a Registry client that is associated with the provided Governor Address via HookClientFactory.
const registryClient = await HookClientFactory.create('REGISTRY');

// Instantiate a Heartbeat client that is associated with the provided Governor Address via HookClientFactory.
const heartbeatClient = await HookClientFactory.create('HEARTBEAT');
```
<br/>

# Governor Client

## GovernorClient class constructor - `GovernorClient(options = {})`

### Parameters
Takes one parameter `options` which is a JSON object of options that is passed to GovernorClient.
```
{
    governorAddress: "rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL",
}
```
| Name                       | Type   | Description                         |
| -------------------------- | ------ | ------------------------------------ |
| governorAddress (optional) | string | Governor Hook Account Xahau address. |

### Example
```javascript
const governorClient = new GovernorClient({
    governorAddress: "rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL"
});
```
>__NOTE :__  If `governorAddress` is not specified, the GovernorClient class will default to using the governorAddress set in the `'Defaults'` configuration.

<br>

# Registry client

## RegistryClient class constructor - `RegistryClient(options = {})`

### Parameters
Takes one parameter `options` which is a JSON object of options that is passed to RegistryClient.
```
{
    registryAddress: 'rQUhXd7sopuga3taru3jfvc1BgVbscrb1X',
    rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com'
}
```
| Name                     | Type   | Description                         |
| ------------------------ | ------ | ----------------------------------- |
| registryAddress          | string | Registry Hook Account Xahau address. |
| rippledServer (optional) | string | Rippled server URL.                 |

### Example
```javascript
const registryClient = new RegistryClient({
    registryAddress: 'rQUhXd7sopuga3taru3jfvc1BgVbscrb1X',
    rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com'
});
```
<br>

# Heartbeat Client

## HeartbeatClient class constructor - `HeartbeatClient(options = {})`

### Parameters
Takes one parameter `options` which is a JSON object of options that is passed to HeartbeatClient.
```
{
    heartbeatAddress: 'raPSFU999HcwpyRojdNh2i96T22gY9fgxL',
    rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com'
}
```
| Name                     | Type   | Description                          |
| ------------------------ | ------ | ------------------------------------ |
| heartbeatAddress         | string | Heartbeat Hook Account Xahau address. |
| rippledServer (optional) | string | Rippled server URL.                  |

### Example
```javascript
const heartbeatClient = new HeartbeatClient({
    heartbeatAddress: 'raPSFU999HcwpyRojdNh2i96T22gY9fgxL',
    rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com'
});
```

<br>

### [Go to common api method references for hook clients.](reference-api-common.md)<br><br>



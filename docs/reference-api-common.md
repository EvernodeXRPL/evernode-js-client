# Evernode defaults

## Override Evernode defaults - `static set(newDefaults)`
Override Evernode default configs.

### Parameters
| Name        | Type   | Description                                                                                                                                                                                                                                               |
| ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| newDefaults | object | Configurations to override  `{ governorAddress: '{string} governor xahau address', rippledServer: '{string} rippled server url', xrplApi: '{XrplApi} xahau instance', stateIndexId: '{string} firestore index', networkID: '{number} rippled network id' }` |

### Response format
This is a void function.

### Example
```javascript
    Defaults.set({
        governorAddress: 'rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL'
    });
```

## Read Evernode defaults - `static get()`
Read Evernode default configs.

### Response format
The Object of Evernode configs

### Example
```javascript
    const defaults = Defaults.get();
```
<br>

# Evernode clients

There are three hook clients and a tenant client in the Evernode library.
- [Hook Clients](reference-api-hook-clients.md)
  - [Governor Client](reference-api-hook-clients.md#governor-client)
  - [Registry Client](reference-api-hook-clients.md#registry-client)
  - [Heartbeat Client](reference-api-hook-clients.md#heartbeat-client)
- [Tenant Client](reference-api-tenant.md)

## Connect to the client - `async connect()`
Connects the client to Xahau server and do the config loading and subscriptions.
- [subscribe](#subscribe-to-the-events---async-subscribe) is called inside this.

### Response format
Returns boolean. `true` if success.

### Example
```javascript
    const status = await client.connect();
```

## Terminate the client - `async disconnect()`
Disconnects the client to Xahau server and do the un-subscriptions.
- [unsubscribe](#unsubscribe-from-the-events---async-unsubscribe) is called inside this.

### Response format
This is a void function.

### Example
```javascript
    await client.disconnect();
```
<br>

## Subscribe to the events - `async subscribe()`
Subscribes to the client [events](reference-api-events.md).

### Response format
This is a void function.

### Example
```javascript
    await client.subscribe();
```

## Unsubscribe from the events - `async unsubscribe()`
Unsubscribes from the client [events](reference-api-events.md).

### Response format
This is a void function.

### Example
```javascript
    await client.unsubscribe();
```
<br>

## Attach the listener - `on(event, handler), once(event, handler)`
Listens to the subscribed [events](reference-api-events.md).
- `on` function will listen for the event without detaching the handler until it's [`off`](#detach-the-listener---offevent-handler--null).
- `once` function will listen only once and detach the handler.

### Parameters
| Name    | Type            | Description                            |
| ------- | --------------- | -------------------------------------- |
| event   | string          | [Event name](reference-api-events.md). |
| handler | function(event) | Callback function to handle the event. |

### Example
```javascript
    client.on(EvernodeEvents.HostRegistered, (ev) => {});
    client.once(EvernodeEvents.HostRegistered, (ev) => {});
```

## Detach the listener - `off(event, handler = null)`
Detaches the listener event.

### Parameters
| Name               | Type            | Description                                                                                                |
| ------------------ | --------------- | ---------------------------------------------------------------------------------------------------------- |
| event              | string          | [Event name](reference-api-events.md).                                                                     |
| handler (optional) | function(event) | Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified. |

### Example
```javascript
    client.off(EvernodeEvents.HostRegistered);
```
<br>

## Check EVR balance - `async getEVRBalance()`
Gets the EVR balance in the registry account.

### Response format
Returns the available EVR amount as a `string`.

### Example
```javascript
    const balance = await client.getEVRBalance();
```
<br>

## Get hook states - `async getHookStates()`
Gets all Xahau hook states in the registry account.

### Response format
Returns the list of hook states including Evernode configuration and hosts.
```
[
    {
        key: '4556520100000000000000000000000000000000000000000000000000000008',
        data: '0A0014000000C04E00000000001800'
    },
    {
        key: '45565202E32B63CB70A23A5CB00E3CB58C8FAEF20F1FC0E81988ADD1286F254D',
        data: '2A42190773386D16A047F2A7433B0283303F1437496E74656C2852292058656F6E285229204350552045352D3236383020763220322E383047487A000200EF0A00350C0088130000409C000078727034457665727340676D61696C2E636F6D000000000000000000000000000000000000000000B1AADC421B001255'
    },
    ...
]
```
| Name | Type   | Description                         |
| ---- | ------ | ----------------------------------- |
| key  | string | Hex string hook state key buffer.   |
| data | string | Hex string of the hook data buffer. |

### Example
```javascript
    const states = await client.getHookStates();
```
<br>

## Get the moment - `async getMoment(index = null)`
Get the moment from the given index (timestamp).

### Parameters
| Name             | Type   | Description                                |
| ---------------- | ------ | ------------------------------------------ |
| index (optional) | number | Index (timestamp) to get the moment value. |

### Response format
The moment of the given index (timestamp) as 'number'. Returns current moment if index (timestamp) is not given.

### Example
```javascript
    const moment = await client.getMoment();
```
<br>

## Get the moment start index - `async getMomentStartIndex(index = null)`
Get start index (timestamp) of the moment.

### Parameters
| Name             | Type   | Description                                      |
| ---------------- | ------ | ------------------------------------------------ |
| index (optional) | number | Index (timestamp) to get the moment start index. |

### Response format
Returns The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.

### Example
```javascript
    const startIdx = await client.getMomentStartIndex();
```
<br>

## Refresh the evernode config - `async refreshConfig()`
Loads the configs from Xahau hook and updates the in memory config.

### Response format
This is a void function.

### Example
```javascript
    await client.refreshConfig();
```
<br>

## Extract the event details from a Xahau transaction - `async extractEvernodeEvent(tx)`
Extracts the transaction info from a given transaction.

### Parameters
| Name | Type   | Description                                                                                                                                             |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tx   | object | Transaction to be deserialized and extracted. _Note: You need to deserialize Memos and HookParameters before passing the transaction to this function._ |

### Response format
Returns the event object in the format `{name: '', data: {}}`. Returns null if not handled.
```
{
    name: 'HostRegUpdated',
    data: {
        transaction: {
            Account: 'rKrSVLgaKQANTSEv1bY4cT4PVThCzFXpX6',
            Amount: '1',
            Destination: 'rQUhXd7sopuga3taru3jfvc1BgVbscrb1X',
            Fee: '11872',
            Flags: 0,
            HookParameters: [Array],
            LastLedgerSequence: 3872428,
            Memos: [],
            NetworkID: 21338,
            Sequence: 2996616,
            SigningPubKey: '0309EAAD262DD00DFD62583BDBBE2CC1C599A6C4BD9D1009AACE65DF36D77FD3B5',
            TransactionType: 'Payment',
            TxnSignature: '304502210081A9B31F86330FEC74B5AAC6480ECD579AFB08E90286F99BE8F09C8484130D1C0220022572EA86A974A23C64221885C4A9E9C88B2FDEB4F98E74FF00927529801C93',
            date: 739869360,
            hash: 'C9807D7B23DF7017F0A24A6C22FDE27655AC17EDFF70328B0F3E5D77A3D47ADA',
            inLedger: 3872420,
            ledger_index: 3872420
        },
        host: 'rKrSVLgaKQANTSEv1bY4cT4PVThCzFXpX6'
    }
}
```
| Name        | Type   | Description                                   |
| ----------- | ------ | --------------------------------------------- |
| name        | string | [Event name](#events).                        |
| transaction | object | The original transaction from the Xahau ledger. |
- There will be more properties in the response which are according to the event type.

### Example
```javascript
    tx.Memos = TransactionHelper.deserializeMemos(tx?.Memos);
    tx.HookParameters = TransactionHelper.deserializeHookParams(tx?.HookParameters);
    const extracted = await client.extractEvernodeEvent(tx);
```

<br>

## Get host info - `async getHostInfo(hostAddress = clientAddress)`
Gets the registered host information.

### Parameters
| Name                   | Type   | Description          |
| ---------------------- | ------ | -------------------- |
| hostAddress (optional) | string | Address of the host. |

### Response format
Returns the registered host information object. Returns null is not registered.
```
{
    address: 'rMJNjFm3qWMSpKfiN6REiTKWUK9aNBgDwM',
    uriTokenId: 'FCB22E2A22F2E284F3ADDE8ECFBCCB137B02761139734C8CE389ED9071E40230',
    countryCode: 'SG',
    description: '',
    registrationLedger: 1977027,
    registrationFee: 5120,
    maxInstances: 1,
    activeInstances: 0,
    lastHeartbeatIndex: 1686556202,
    version: '0.6.3',
    isATransferer: 0,
    lastVoteCandidateIdx: 2,
    lastVoteTimestamp: 1685940521,
    supportVoteSent: 1,
    registrationTimestamp: 1680843410,
    active: true,
    cpuModelName: 'Intel Core Processor (Broadwell, no TSX,',
    cpuCount: 1,
    cpuMHz: 2399,
    cpuMicrosec: 800000,
    ramMb: 2766,
    diskMb: 12368,
    email: 'testhost@gmail.com',
    accumulatedRewardAmount: '506.6666666666673'
}
```
| Name                    | Type    | Description                                                           |
| ----------------------- | ------- | --------------------------------------------------------------------- |
| address                 | string  | Xahau account address of the host.                                     |
| uriTokenId              | string  | Registration URI Token ID of the host.                                |
| countryCode             | string  | Host machine's origin country code.                                   |
| description             | string  | IP address or the DNS of the host.                                    |
| registrationLedger      | number  | Host machine registered Xahau ledger.                                   |
| registrationFee         | number  | Registration fee paid by the host when it's registered.               |
| maxInstances            | number  | Max number of instances that can be created in the host.              |
| activeInstances         | number  | Currently allocated instance count in the host machine.               |
| lastHeartbeatIndex      | number  | Timestamp that the last heartbeat is received.                        |
| version                 | string  | Sashimono version installed in the host machine.                      |
| isATransferer           | number  | 1 - If transfer is initiated for the host, 0 - If not.                |
| lastVoteCandidateIdx    | number  | Index of the candidate which host has recently voted.                 |
| lastVoteTimestamp       | number  | Timestamp when the host sent the last vote.                           |
| supportVoteSent         | number  | 1 - If host sent a support vote for the moment, 0 - If not.           |
| registrationTimestamp   | number  | Timestamp when the host was registered.                               |
| active                  | boolean | Boolean indicating whether the host is active or not.                 |
| cpuModelName            | string  | CPU model of the host machine.                                        |
| cpuCount                | number  | CPU count of the host machine.                                        |
| cpuMHz                  | number  | CPU speed of the host.                                                |
| cpuMicrosec             | number  | CPU time in micro seconds allocated for Evernode.                     |
| ramMb                   | number  | Host machine's Evernode allocated RAM in MBs.                         |
| diskMb                  | number  | Disk space allocated for Evernode in the host.                        |
| email                   | number  | Public email address of the host.                                     |
| accumulatedRewardAmount | number  | Currently accumulated reward amount that foundation owed to the host. |

### Example
```javascript
    const hostInfo = await registryClient.getHostInfo('r3tSGeDFJaz8GEVmM6oUuYTAiNdDJhitCt');
```

<br>

## Prune dead host - `async pruneDeadHost(hostAddress)`
Remove a host which is inactive for a long period. The inactivity is checked by Evernode itself and only pruned if inactive thresholds are met.

### Parameters
| Name        | Type   | Description                            |
| ----------- | ------ | -------------------------------------- |
| hostAddress | string | Xahau address of the host to be pruned. |

### Response format
This is a void function.

### Example
```javascript
    await client.pruneDeadHost('rPvhbE9hNgSCb6tgMCoDwsxRgewxcvD7jk');
```

<br>
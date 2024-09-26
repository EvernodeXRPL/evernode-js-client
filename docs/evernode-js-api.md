# Evernode JS API Documentation
## Classes

<dl>
<dt><a href="#BaseEvernodeClient">BaseEvernodeClient</a></dt>
<dd><p>Creates an instance of BaseEvernodeClient.</p>
</dd>
<dt><a href="#FoundationClient">FoundationClient</a> ⇐ <code><a href="#BaseEvernodeClient">BaseEvernodeClient</a></code></dt>
<dd><p>FoundationClient class to manage and interact with foundation operations.
It extends the BaseEvernodeClient.</p>
</dd>
<dt><a href="#HeartbeatClient">HeartbeatClient</a> ⇐ <code><a href="#BaseEvernodeClient">BaseEvernodeClient</a></code></dt>
<dd><p>HeartbeatClient is responsible for managing heartbeat operations in Evernode.
It interacts with the XRP Ledger using the heartbeat address and listens for specific heartbeat events.</p>
</dd>
<dt><a href="#HookClientFactory">HookClientFactory</a></dt>
<dd><p>A factory class for creating different types of hook clients based on the provided hook type.</p>
</dd>
<dt><a href="#RegistryClient">RegistryClient</a> ⇐ <code><a href="#BaseEvernodeClient">BaseEvernodeClient</a></code></dt>
<dd><p>RegistryClient is responsible for managing registry operations in Evernode.
It interacts with the XRP Ledger using the registry address and listens for specific registry events.</p>
</dd>
<dt><a href="#HostClient">HostClient</a> ⇐ <code><a href="#BaseEvernodeClient">BaseEvernodeClient</a></code></dt>
<dd><p>HostClient class to manage host operations.
It extends the BaseEvernodeClient.</p>
</dd>
<dt><a href="#TenantClient">TenantClient</a> ⇐ <code><a href="#BaseEvernodeClient">BaseEvernodeClient</a></code></dt>
<dd><p>TenantClient class to manage tenant operations.
It extends the BaseEvernodeClient.</p>
</dd>
<dt><a href="#Defaults">Defaults</a></dt>
<dd><p>Defaults class is responsible for retrieving and overriding the default Evernode network configurations.</p>
</dd>
<dt><a href="#EncryptionHelper">EncryptionHelper</a></dt>
<dd><p>EncryptionHelper class is responsible for encrypt and decrypt functions for messages.</p>
</dd>
<dt><a href="#EvernodeHelpers">EvernodeHelpers</a></dt>
<dd><p>Provides various utility functions for working with leases, tokens, and ledger entries within the Xahau ecosystem.</p>
</dd>
<dt><a href="#StateHelpers">StateHelpers</a></dt>
<dd><p>Provides various utility functions for working with States.</p>
</dd>
<dt><a href="#TransactionHelper">TransactionHelper</a></dt>
<dd><p>Provides various utility functions for working with Xahau Transactions.</p>
</dd>
<dt><a href="#UtilHelpers">UtilHelpers</a></dt>
<dd><p>Provides utility helper functions for various operations.</p>
</dd>
<dt><a href="#XflHelpers">XflHelpers</a></dt>
<dd><p>Helper class for handling XFL (Extended Floating-Point) float numbers.</p>
</dd>
<dt><a href="#XrplAccount">XrplAccount</a></dt>
<dd><p>Represents an XRP Ledger account and provides methods for account management.</p>
</dd>
<dt><a href="#XrplApi">XrplApi</a></dt>
<dd><p>Class representing an XRPL API client.</p>
</dd>
</dl>

<a name="BaseEvernodeClient"></a>

## BaseEvernodeClient
Creates an instance of BaseEvernodeClient.

**Kind**: global class  

* [BaseEvernodeClient](#BaseEvernodeClient)
    * [new BaseEvernodeClient(xrpAddress, xrpSecret, watchEvents, [autoSubscribe], [options])](#new_BaseEvernodeClient_new)
    * [.on(event, handler)](#BaseEvernodeClient+on)
    * [.once(event, handler)](#BaseEvernodeClient+once)
    * [.off(event, handler)](#BaseEvernodeClient+off)
    * [.connect()](#BaseEvernodeClient+connect) ⇒
    * [.disconnect()](#BaseEvernodeClient+disconnect)
    * [.subscribe()](#BaseEvernodeClient+subscribe)
    * [.unsubscribe()](#BaseEvernodeClient+unsubscribe)
    * [.getEVRBalance()](#BaseEvernodeClient+getEVRBalance) ⇒
    * [.getHookStates()](#BaseEvernodeClient+getHookStates) ⇒
    * [.getMoment(index)](#BaseEvernodeClient+getMoment) ⇒
    * [.getMomentStartIndex(index)](#BaseEvernodeClient+getMomentStartIndex) ⇒
    * [.refreshConfig()](#BaseEvernodeClient+refreshConfig)
    * [.extractEvernodeEvent(tx)](#BaseEvernodeClient+extractEvernodeEvent) ⇒
    * [.getHostInfo(hostAddress)](#BaseEvernodeClient+getHostInfo) ⇒
    * [.getAllHostsFromLedger()](#BaseEvernodeClient+getAllHostsFromLedger) ⇒
    * [.getAllCandidatesFromLedger()](#BaseEvernodeClient+getAllCandidatesFromLedger) ⇒
    * [.pruneDeadHost(hostAddress)](#BaseEvernodeClient+pruneDeadHost)
    * [.getCandidateByOwner(ownerAddress)](#BaseEvernodeClient+getCandidateByOwner) ⇒
    * [.getDudHostCandidatesByOwner(ownerAddress)](#BaseEvernodeClient+getDudHostCandidatesByOwner) ⇒
    * [.getCandidateById(candidateId)](#BaseEvernodeClient+getCandidateById) ⇒
    * [.getDudHostVoteInfo(hostAddress)](#BaseEvernodeClient+getDudHostVoteInfo) ⇒
    * [.getPilotedModeVoteInfo()](#BaseEvernodeClient+getPilotedModeVoteInfo) ⇒
    * [.getReputationAddressByOrderedId(orderedId, moment)](#BaseEvernodeClient+getReputationAddressByOrderedId) ⇒
    * [.getReputationOrderByAddress(hostAddress, moment)](#BaseEvernodeClient+getReputationOrderByAddress) ⇒
    * [.getReputationContractInfoByAddress(hostsAddress, moment)](#BaseEvernodeClient+getReputationContractInfoByAddress) ⇒
    * [.getReputationInfoByAddress(hostsAddress)](#BaseEvernodeClient+getReputationInfoByAddress) ⇒

<a name="new_BaseEvernodeClient_new"></a>

### new BaseEvernodeClient(xrpAddress, xrpSecret, watchEvents, [autoSubscribe], [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| xrpAddress | <code>string</code> |  | The XRP address associated with the client. |
| xrpSecret | <code>string</code> |  | The XRP secret associated with the client. |
| watchEvents | <code>Array.&lt;string&gt;</code> |  | An array of event names to watch. |
| [autoSubscribe] | <code>boolean</code> | <code>false</code> | Whether to automatically subscribe to events. |
| [options] | <code>Object</code> | <code>{}</code> | Optional configuration options. |
| [options.governorAddress] | <code>string</code> |  | The governor address. Defaults to a predefined value if not provided. |
| [options.xrplApi] | [<code>XrplApi</code>](#XrplApi) |  | An instance of XrplApi. If not provided, a new instance will be created. |
| [options.rippledServer] | <code>string</code> |  | The URL of the rippled server to use if a new XrplApi instance is created. |
| [options.config] | <code>Object</code> |  | Optional configuration settings. |
| [options.messagePrivateKey] | <code>string</code> |  | The private key for message encryption, if required. |

<a name="BaseEvernodeClient+on"></a>

### baseEvernodeClient.on(event, handler)
Listens to the subscribed events. This will listen for the event without detaching the handler until it's 'off'.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event to listen for. |
| handler | <code>function</code> | The callback function to handle the event. The function takes the event object as a parameter. |

<a name="BaseEvernodeClient+once"></a>

### baseEvernodeClient.once(event, handler)
Listens to the subscribed events. This will listen only once and detach the handler.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | Event name. |
| handler | <code>function</code> | Callback function to handle the event. |

<a name="BaseEvernodeClient+off"></a>

### baseEvernodeClient.off(event, handler)
Detach the listener event.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | Event name. |
| handler | <code>function</code> | <code></code> | (optional) Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified. |

<a name="BaseEvernodeClient+connect"></a>

### baseEvernodeClient.connect() ⇒
Connects the client to xrpl server and do the config loading and subscriptions. 'subscribe' is called inside this.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: Boolean value `true` if the connection is successful.  
<a name="BaseEvernodeClient+disconnect"></a>

### baseEvernodeClient.disconnect()
Disconnects the client to xrpl server and do the un-subscriptions. 'unsubscribe' is called inside this.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
<a name="BaseEvernodeClient+subscribe"></a>

### baseEvernodeClient.subscribe()
Subscribes to the client events.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
<a name="BaseEvernodeClient+unsubscribe"></a>

### baseEvernodeClient.unsubscribe()
Unsubscribes from the client events.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
<a name="BaseEvernodeClient+getEVRBalance"></a>

### baseEvernodeClient.getEVRBalance() ⇒
Get the EVR balance in the account.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The available EVR amount as a string.  
<a name="BaseEvernodeClient+getHookStates"></a>

### baseEvernodeClient.getHookStates() ⇒
Get all XRPL hook states in the registry account.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The list of hook states, including Evernode configuration and hosts.  
<a name="BaseEvernodeClient+getMoment"></a>

### baseEvernodeClient.getMoment(index) ⇒
Get the moment from the given index (timestamp).

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The moment of the given index (timestamp) as a number. Returns the current moment if the timestamp is not provided.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment value. |

<a name="BaseEvernodeClient+getMomentStartIndex"></a>

### baseEvernodeClient.getMomentStartIndex(index) ⇒
Get start index (timestamp) of the moment.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment start index. |

<a name="BaseEvernodeClient+refreshConfig"></a>

### baseEvernodeClient.refreshConfig()
Loads the configs from XRPL hook and updates the in-memory config.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
<a name="BaseEvernodeClient+extractEvernodeEvent"></a>

### baseEvernodeClient.extractEvernodeEvent(tx) ⇒
Extracts the transaction info from a given transaction.
Note: You need to deserialize HookParameters before passing the transaction to this function.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The event object in format `{name: string, data: Object}`. Returns `null` if the event is not handled.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | The transaction object to be deserialized and extracted. |

<a name="BaseEvernodeClient+getHostInfo"></a>

### baseEvernodeClient.getHostInfo(hostAddress) ⇒
Get the registered host information.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The registered host information object. Returns null if not registered.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the host. |

<a name="BaseEvernodeClient+getAllHostsFromLedger"></a>

### baseEvernodeClient.getAllHostsFromLedger() ⇒
Get the hosts registered in Evernode.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The list of hosts.  
<a name="BaseEvernodeClient+getAllCandidatesFromLedger"></a>

### baseEvernodeClient.getAllCandidatesFromLedger() ⇒
Get the governor in Evernode.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The list of candidates.  
<a name="BaseEvernodeClient+pruneDeadHost"></a>

### baseEvernodeClient.pruneDeadHost(hostAddress)
Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to be pruned. |

<a name="BaseEvernodeClient+getCandidateByOwner"></a>

### baseEvernodeClient.getCandidateByOwner(ownerAddress) ⇒
Get proposed new hook candidate info.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | [Optional] Address of the owner. |

<a name="BaseEvernodeClient+getDudHostCandidatesByOwner"></a>

### baseEvernodeClient.getDudHostCandidatesByOwner(ownerAddress) ⇒
Get proposed dud host candidates.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: An array of candidate information. Returns empty array if no candidates.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | | Address of the owner |

<a name="BaseEvernodeClient+getCandidateById"></a>

### baseEvernodeClient.getCandidateById(candidateId) ⇒
Get candidate info.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate. |

<a name="BaseEvernodeClient+getDudHostVoteInfo"></a>

### baseEvernodeClient.getDudHostVoteInfo(hostAddress) ⇒
Get reported dud host info.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The dud host candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the dud host. |

<a name="BaseEvernodeClient+getPilotedModeVoteInfo"></a>

### baseEvernodeClient.getPilotedModeVoteInfo() ⇒
Get piloted mode vote info.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: The piloted mode candidate information. Returns null if no candidate.  
<a name="BaseEvernodeClient+getReputationAddressByOrderedId"></a>

### baseEvernodeClient.getReputationAddressByOrderedId(orderedId, moment) ⇒
Get reputation order info of given orderedId.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: Reputation address info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| orderedId | <code>number</code> |  | Order id of the host. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationOrderByAddress"></a>

### baseEvernodeClient.getReputationOrderByAddress(hostAddress, moment) ⇒
Get reputation order info of given host.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: Reputation order info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hostAddress | <code>string</code> |  | (optional) Host address. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationContractInfoByAddress"></a>

### baseEvernodeClient.getReputationContractInfoByAddress(hostsAddress, moment) ⇒
Get reputation contract info of given host.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: Reputation contract info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |
| moment | <code>number</code> | (optional) Moment to get reputation contract info for. |

<a name="BaseEvernodeClient+getReputationInfoByAddress"></a>

### baseEvernodeClient.getReputationInfoByAddress(hostsAddress) ⇒
Get reputation info of given host.

**Kind**: instance method of [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  
**Returns**: Reputation info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |

<a name="FoundationClient"></a>

## FoundationClient ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
FoundationClient class to manage and interact with foundation operations.
It extends the BaseEvernodeClient.

**Kind**: global class  
**Extends**: [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

* [FoundationClient](#FoundationClient) ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
    * [new FoundationClient(xrpAddress, xrpSecret, [options])](#new_FoundationClient_new)
    * [.propose(hashes, shortName, options)](#FoundationClient+propose) ⇒
    * [.withdraw(candidateId, options)](#FoundationClient+withdraw) ⇒
    * [.vote(candidateId, vote, options)](#FoundationClient+vote) ⇒
    * [.reportDudHost(hostAddress, options)](#FoundationClient+reportDudHost) ⇒
    * [.voteDudHost(hostAddress, vote, options)](#FoundationClient+voteDudHost) ⇒
    * [.votePilotedMode(vote, options)](#FoundationClient+votePilotedMode) ⇒
    * [.changeGovernanceMode(mode, options)](#FoundationClient+changeGovernanceMode) ⇒
    * [.updateHostReputation(hostAddress, reputation, options)](#FoundationClient+updateHostReputation) ⇒
    * [.on(event, handler)](#BaseEvernodeClient+on)
    * [.once(event, handler)](#BaseEvernodeClient+once)
    * [.off(event, handler)](#BaseEvernodeClient+off)
    * [.connect()](#BaseEvernodeClient+connect) ⇒
    * [.disconnect()](#BaseEvernodeClient+disconnect)
    * [.subscribe()](#BaseEvernodeClient+subscribe)
    * [.unsubscribe()](#BaseEvernodeClient+unsubscribe)
    * [.getEVRBalance()](#BaseEvernodeClient+getEVRBalance) ⇒
    * [.getHookStates()](#BaseEvernodeClient+getHookStates) ⇒
    * [.getMoment(index)](#BaseEvernodeClient+getMoment) ⇒
    * [.getMomentStartIndex(index)](#BaseEvernodeClient+getMomentStartIndex) ⇒
    * [.refreshConfig()](#BaseEvernodeClient+refreshConfig)
    * [.extractEvernodeEvent(tx)](#BaseEvernodeClient+extractEvernodeEvent) ⇒
    * [.getHostInfo(hostAddress)](#BaseEvernodeClient+getHostInfo) ⇒
    * [.getAllHostsFromLedger()](#BaseEvernodeClient+getAllHostsFromLedger) ⇒
    * [.getAllCandidatesFromLedger()](#BaseEvernodeClient+getAllCandidatesFromLedger) ⇒
    * [.pruneDeadHost(hostAddress)](#BaseEvernodeClient+pruneDeadHost)
    * [.getCandidateByOwner(ownerAddress)](#BaseEvernodeClient+getCandidateByOwner) ⇒
    * [.getDudHostCandidatesByOwner(ownerAddress)](#BaseEvernodeClient+getDudHostCandidatesByOwner) ⇒
    * [.getCandidateById(candidateId)](#BaseEvernodeClient+getCandidateById) ⇒
    * [.getDudHostVoteInfo(hostAddress)](#BaseEvernodeClient+getDudHostVoteInfo) ⇒
    * [.getPilotedModeVoteInfo()](#BaseEvernodeClient+getPilotedModeVoteInfo) ⇒
    * [.getReputationAddressByOrderedId(orderedId, moment)](#BaseEvernodeClient+getReputationAddressByOrderedId) ⇒
    * [.getReputationOrderByAddress(hostAddress, moment)](#BaseEvernodeClient+getReputationOrderByAddress) ⇒
    * [.getReputationContractInfoByAddress(hostsAddress, moment)](#BaseEvernodeClient+getReputationContractInfoByAddress) ⇒
    * [.getReputationInfoByAddress(hostsAddress)](#BaseEvernodeClient+getReputationInfoByAddress) ⇒

<a name="new_FoundationClient_new"></a>

### new FoundationClient(xrpAddress, xrpSecret, [options])
Creates an instance of FoundationClient.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| xrpAddress | <code>string</code> |  | The XRP address to associate with this client. |
| xrpSecret | <code>string</code> |  | The secret (private key) associated with the XRP address. |
| [options] | <code>Object</code> | <code>{}</code> | Additional configuration options for the FoundationClient. |

<a name="FoundationClient+propose"></a>

### foundationClient.propose(hashes, shortName, options) ⇒
Propose a new hook candidate.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Proposed candidate id.  

| Param | Type | Description |
| --- | --- | --- |
| hashes | <code>string</code> | Hook candidate hashes in hex format, <GOVERNOR_HASH(32)><REGISTRY_HASH(32)><HEARTBEAT_HASH(32)>. |
| shortName | <code>string</code> | Short name for the proposal candidate. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="FoundationClient+withdraw"></a>

### foundationClient.withdraw(candidateId, options) ⇒
Withdraw a hook candidate.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate in hex format. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="FoundationClient+vote"></a>

### foundationClient.vote(candidateId, vote, options) ⇒
Vote for a hook candidate.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate in hex format. |
| vote | <code>int</code> | Vote value CandidateVote (0 - Reject, 1 - Support). |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="FoundationClient+reportDudHost"></a>

### foundationClient.reportDudHost(hostAddress, options) ⇒
Report dud host for removal.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | Address of the dud host. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="FoundationClient+voteDudHost"></a>

### foundationClient.voteDudHost(hostAddress, vote, options) ⇒
Vote for a dud host.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | Address of the dud host. |
| vote | <code>int</code> | Vote value CandidateVote (0 - Reject, 1 - Support). |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="FoundationClient+votePilotedMode"></a>

### foundationClient.votePilotedMode(vote, options) ⇒
Vote for a piloted mode.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| vote | <code>int</code> | Vote value CandidateVote (0 - Reject, 1 - Support). |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="FoundationClient+changeGovernanceMode"></a>

### foundationClient.changeGovernanceMode(mode, options) ⇒
Change the governance mode.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| mode | <code>int</code> | Mode  (1 - Piloted, 2 - CoPiloted, 3 - AutoPiloted). |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="FoundationClient+updateHostReputation"></a>

### foundationClient.updateHostReputation(hostAddress, reputation, options) ⇒
Update the reputation of the host.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | Address of the dud host. |
| reputation | <code>number</code> | Host reputation value. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="BaseEvernodeClient+on"></a>

### foundationClient.on(event, handler)
Listens to the subscribed events. This will listen for the event without detaching the handler until it's 'off'.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>on</code>](#BaseEvernodeClient+on)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event to listen for. |
| handler | <code>function</code> | The callback function to handle the event. The function takes the event object as a parameter. |

<a name="BaseEvernodeClient+once"></a>

### foundationClient.once(event, handler)
Listens to the subscribed events. This will listen only once and detach the handler.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>once</code>](#BaseEvernodeClient+once)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | Event name. |
| handler | <code>function</code> | Callback function to handle the event. |

<a name="BaseEvernodeClient+off"></a>

### foundationClient.off(event, handler)
Detach the listener event.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>off</code>](#BaseEvernodeClient+off)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | Event name. |
| handler | <code>function</code> | <code></code> | (optional) Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified. |

<a name="BaseEvernodeClient+connect"></a>

### foundationClient.connect() ⇒
Connects the client to xrpl server and do the config loading and subscriptions. 'subscribe' is called inside this.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>connect</code>](#BaseEvernodeClient+connect)  
**Returns**: Boolean value `true` if the connection is successful.  
<a name="BaseEvernodeClient+disconnect"></a>

### foundationClient.disconnect()
Disconnects the client to xrpl server and do the un-subscriptions. 'unsubscribe' is called inside this.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>disconnect</code>](#BaseEvernodeClient+disconnect)  
<a name="BaseEvernodeClient+subscribe"></a>

### foundationClient.subscribe()
Subscribes to the client events.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>subscribe</code>](#BaseEvernodeClient+subscribe)  
<a name="BaseEvernodeClient+unsubscribe"></a>

### foundationClient.unsubscribe()
Unsubscribes from the client events.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>unsubscribe</code>](#BaseEvernodeClient+unsubscribe)  
<a name="BaseEvernodeClient+getEVRBalance"></a>

### foundationClient.getEVRBalance() ⇒
Get the EVR balance in the account.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getEVRBalance</code>](#BaseEvernodeClient+getEVRBalance)  
**Returns**: The available EVR amount as a string.  
<a name="BaseEvernodeClient+getHookStates"></a>

### foundationClient.getHookStates() ⇒
Get all XRPL hook states in the registry account.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getHookStates</code>](#BaseEvernodeClient+getHookStates)  
**Returns**: The list of hook states, including Evernode configuration and hosts.  
<a name="BaseEvernodeClient+getMoment"></a>

### foundationClient.getMoment(index) ⇒
Get the moment from the given index (timestamp).

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getMoment</code>](#BaseEvernodeClient+getMoment)  
**Returns**: The moment of the given index (timestamp) as a number. Returns the current moment if the timestamp is not provided.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment value. |

<a name="BaseEvernodeClient+getMomentStartIndex"></a>

### foundationClient.getMomentStartIndex(index) ⇒
Get start index (timestamp) of the moment.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getMomentStartIndex</code>](#BaseEvernodeClient+getMomentStartIndex)  
**Returns**: The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment start index. |

<a name="BaseEvernodeClient+refreshConfig"></a>

### foundationClient.refreshConfig()
Loads the configs from XRPL hook and updates the in-memory config.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>refreshConfig</code>](#BaseEvernodeClient+refreshConfig)  
<a name="BaseEvernodeClient+extractEvernodeEvent"></a>

### foundationClient.extractEvernodeEvent(tx) ⇒
Extracts the transaction info from a given transaction.
Note: You need to deserialize HookParameters before passing the transaction to this function.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>extractEvernodeEvent</code>](#BaseEvernodeClient+extractEvernodeEvent)  
**Returns**: The event object in format `{name: string, data: Object}`. Returns `null` if the event is not handled.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | The transaction object to be deserialized and extracted. |

<a name="BaseEvernodeClient+getHostInfo"></a>

### foundationClient.getHostInfo(hostAddress) ⇒
Get the registered host information.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getHostInfo</code>](#BaseEvernodeClient+getHostInfo)  
**Returns**: The registered host information object. Returns null if not registered.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the host. |

<a name="BaseEvernodeClient+getAllHostsFromLedger"></a>

### foundationClient.getAllHostsFromLedger() ⇒
Get the hosts registered in Evernode.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getAllHostsFromLedger</code>](#BaseEvernodeClient+getAllHostsFromLedger)  
**Returns**: The list of hosts.  
<a name="BaseEvernodeClient+getAllCandidatesFromLedger"></a>

### foundationClient.getAllCandidatesFromLedger() ⇒
Get the governor in Evernode.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getAllCandidatesFromLedger</code>](#BaseEvernodeClient+getAllCandidatesFromLedger)  
**Returns**: The list of candidates.  
<a name="BaseEvernodeClient+pruneDeadHost"></a>

### foundationClient.pruneDeadHost(hostAddress)
Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>pruneDeadHost</code>](#BaseEvernodeClient+pruneDeadHost)  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to be pruned. |

<a name="BaseEvernodeClient+getCandidateByOwner"></a>

### foundationClient.getCandidateByOwner(ownerAddress) ⇒
Get proposed new hook candidate info.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getCandidateByOwner</code>](#BaseEvernodeClient+getCandidateByOwner)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | [Optional] Address of the owner. |

<a name="BaseEvernodeClient+getDudHostCandidatesByOwner"></a>

### foundationClient.getDudHostCandidatesByOwner(ownerAddress) ⇒
Get proposed dud host candidates.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getDudHostCandidatesByOwner</code>](#BaseEvernodeClient+getDudHostCandidatesByOwner)  
**Returns**: An array of candidate information. Returns empty array if no candidates.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | | Address of the owner |

<a name="BaseEvernodeClient+getCandidateById"></a>

### foundationClient.getCandidateById(candidateId) ⇒
Get candidate info.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getCandidateById</code>](#BaseEvernodeClient+getCandidateById)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate. |

<a name="BaseEvernodeClient+getDudHostVoteInfo"></a>

### foundationClient.getDudHostVoteInfo(hostAddress) ⇒
Get reported dud host info.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getDudHostVoteInfo</code>](#BaseEvernodeClient+getDudHostVoteInfo)  
**Returns**: The dud host candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the dud host. |

<a name="BaseEvernodeClient+getPilotedModeVoteInfo"></a>

### foundationClient.getPilotedModeVoteInfo() ⇒
Get piloted mode vote info.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getPilotedModeVoteInfo</code>](#BaseEvernodeClient+getPilotedModeVoteInfo)  
**Returns**: The piloted mode candidate information. Returns null if no candidate.  
<a name="BaseEvernodeClient+getReputationAddressByOrderedId"></a>

### foundationClient.getReputationAddressByOrderedId(orderedId, moment) ⇒
Get reputation order info of given orderedId.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getReputationAddressByOrderedId</code>](#BaseEvernodeClient+getReputationAddressByOrderedId)  
**Returns**: Reputation address info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| orderedId | <code>number</code> |  | Order id of the host. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationOrderByAddress"></a>

### foundationClient.getReputationOrderByAddress(hostAddress, moment) ⇒
Get reputation order info of given host.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getReputationOrderByAddress</code>](#BaseEvernodeClient+getReputationOrderByAddress)  
**Returns**: Reputation order info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hostAddress | <code>string</code> |  | (optional) Host address. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationContractInfoByAddress"></a>

### foundationClient.getReputationContractInfoByAddress(hostsAddress, moment) ⇒
Get reputation contract info of given host.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getReputationContractInfoByAddress</code>](#BaseEvernodeClient+getReputationContractInfoByAddress)  
**Returns**: Reputation contract info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |
| moment | <code>number</code> | (optional) Moment to get reputation contract info for. |

<a name="BaseEvernodeClient+getReputationInfoByAddress"></a>

### foundationClient.getReputationInfoByAddress(hostsAddress) ⇒
Get reputation info of given host.

**Kind**: instance method of [<code>FoundationClient</code>](#FoundationClient)  
**Overrides**: [<code>getReputationInfoByAddress</code>](#BaseEvernodeClient+getReputationInfoByAddress)  
**Returns**: Reputation info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |

<a name="HeartbeatClient"></a>

## HeartbeatClient ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
HeartbeatClient is responsible for managing heartbeat operations in Evernode.
It interacts with the XRP Ledger using the heartbeat address and listens for specific heartbeat events.

**Kind**: global class  
**Extends**: [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

* [HeartbeatClient](#HeartbeatClient) ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
    * [.on(event, handler)](#BaseEvernodeClient+on)
    * [.once(event, handler)](#BaseEvernodeClient+once)
    * [.off(event, handler)](#BaseEvernodeClient+off)
    * [.connect()](#BaseEvernodeClient+connect) ⇒
    * [.disconnect()](#BaseEvernodeClient+disconnect)
    * [.subscribe()](#BaseEvernodeClient+subscribe)
    * [.unsubscribe()](#BaseEvernodeClient+unsubscribe)
    * [.getEVRBalance()](#BaseEvernodeClient+getEVRBalance) ⇒
    * [.getHookStates()](#BaseEvernodeClient+getHookStates) ⇒
    * [.getMoment(index)](#BaseEvernodeClient+getMoment) ⇒
    * [.getMomentStartIndex(index)](#BaseEvernodeClient+getMomentStartIndex) ⇒
    * [.refreshConfig()](#BaseEvernodeClient+refreshConfig)
    * [.extractEvernodeEvent(tx)](#BaseEvernodeClient+extractEvernodeEvent) ⇒
    * [.getHostInfo(hostAddress)](#BaseEvernodeClient+getHostInfo) ⇒
    * [.getAllHostsFromLedger()](#BaseEvernodeClient+getAllHostsFromLedger) ⇒
    * [.getAllCandidatesFromLedger()](#BaseEvernodeClient+getAllCandidatesFromLedger) ⇒
    * [.pruneDeadHost(hostAddress)](#BaseEvernodeClient+pruneDeadHost)
    * [.getCandidateByOwner(ownerAddress)](#BaseEvernodeClient+getCandidateByOwner) ⇒
    * [.getDudHostCandidatesByOwner(ownerAddress)](#BaseEvernodeClient+getDudHostCandidatesByOwner) ⇒
    * [.getCandidateById(candidateId)](#BaseEvernodeClient+getCandidateById) ⇒
    * [.getDudHostVoteInfo(hostAddress)](#BaseEvernodeClient+getDudHostVoteInfo) ⇒
    * [.getPilotedModeVoteInfo()](#BaseEvernodeClient+getPilotedModeVoteInfo) ⇒
    * [.getReputationAddressByOrderedId(orderedId, moment)](#BaseEvernodeClient+getReputationAddressByOrderedId) ⇒
    * [.getReputationOrderByAddress(hostAddress, moment)](#BaseEvernodeClient+getReputationOrderByAddress) ⇒
    * [.getReputationContractInfoByAddress(hostsAddress, moment)](#BaseEvernodeClient+getReputationContractInfoByAddress) ⇒
    * [.getReputationInfoByAddress(hostsAddress)](#BaseEvernodeClient+getReputationInfoByAddress) ⇒

<a name="BaseEvernodeClient+on"></a>

### heartbeatClient.on(event, handler)
Listens to the subscribed events. This will listen for the event without detaching the handler until it's 'off'.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>on</code>](#BaseEvernodeClient+on)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event to listen for. |
| handler | <code>function</code> | The callback function to handle the event. The function takes the event object as a parameter. |

<a name="BaseEvernodeClient+once"></a>

### heartbeatClient.once(event, handler)
Listens to the subscribed events. This will listen only once and detach the handler.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>once</code>](#BaseEvernodeClient+once)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | Event name. |
| handler | <code>function</code> | Callback function to handle the event. |

<a name="BaseEvernodeClient+off"></a>

### heartbeatClient.off(event, handler)
Detach the listener event.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>off</code>](#BaseEvernodeClient+off)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | Event name. |
| handler | <code>function</code> | <code></code> | (optional) Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified. |

<a name="BaseEvernodeClient+connect"></a>

### heartbeatClient.connect() ⇒
Connects the client to xrpl server and do the config loading and subscriptions. 'subscribe' is called inside this.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>connect</code>](#BaseEvernodeClient+connect)  
**Returns**: Boolean value `true` if the connection is successful.  
<a name="BaseEvernodeClient+disconnect"></a>

### heartbeatClient.disconnect()
Disconnects the client to xrpl server and do the un-subscriptions. 'unsubscribe' is called inside this.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>disconnect</code>](#BaseEvernodeClient+disconnect)  
<a name="BaseEvernodeClient+subscribe"></a>

### heartbeatClient.subscribe()
Subscribes to the client events.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>subscribe</code>](#BaseEvernodeClient+subscribe)  
<a name="BaseEvernodeClient+unsubscribe"></a>

### heartbeatClient.unsubscribe()
Unsubscribes from the client events.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>unsubscribe</code>](#BaseEvernodeClient+unsubscribe)  
<a name="BaseEvernodeClient+getEVRBalance"></a>

### heartbeatClient.getEVRBalance() ⇒
Get the EVR balance in the account.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getEVRBalance</code>](#BaseEvernodeClient+getEVRBalance)  
**Returns**: The available EVR amount as a string.  
<a name="BaseEvernodeClient+getHookStates"></a>

### heartbeatClient.getHookStates() ⇒
Get all XRPL hook states in the registry account.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getHookStates</code>](#BaseEvernodeClient+getHookStates)  
**Returns**: The list of hook states, including Evernode configuration and hosts.  
<a name="BaseEvernodeClient+getMoment"></a>

### heartbeatClient.getMoment(index) ⇒
Get the moment from the given index (timestamp).

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getMoment</code>](#BaseEvernodeClient+getMoment)  
**Returns**: The moment of the given index (timestamp) as a number. Returns the current moment if the timestamp is not provided.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment value. |

<a name="BaseEvernodeClient+getMomentStartIndex"></a>

### heartbeatClient.getMomentStartIndex(index) ⇒
Get start index (timestamp) of the moment.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getMomentStartIndex</code>](#BaseEvernodeClient+getMomentStartIndex)  
**Returns**: The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment start index. |

<a name="BaseEvernodeClient+refreshConfig"></a>

### heartbeatClient.refreshConfig()
Loads the configs from XRPL hook and updates the in-memory config.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>refreshConfig</code>](#BaseEvernodeClient+refreshConfig)  
<a name="BaseEvernodeClient+extractEvernodeEvent"></a>

### heartbeatClient.extractEvernodeEvent(tx) ⇒
Extracts the transaction info from a given transaction.
Note: You need to deserialize HookParameters before passing the transaction to this function.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>extractEvernodeEvent</code>](#BaseEvernodeClient+extractEvernodeEvent)  
**Returns**: The event object in format `{name: string, data: Object}`. Returns `null` if the event is not handled.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | The transaction object to be deserialized and extracted. |

<a name="BaseEvernodeClient+getHostInfo"></a>

### heartbeatClient.getHostInfo(hostAddress) ⇒
Get the registered host information.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getHostInfo</code>](#BaseEvernodeClient+getHostInfo)  
**Returns**: The registered host information object. Returns null if not registered.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the host. |

<a name="BaseEvernodeClient+getAllHostsFromLedger"></a>

### heartbeatClient.getAllHostsFromLedger() ⇒
Get the hosts registered in Evernode.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getAllHostsFromLedger</code>](#BaseEvernodeClient+getAllHostsFromLedger)  
**Returns**: The list of hosts.  
<a name="BaseEvernodeClient+getAllCandidatesFromLedger"></a>

### heartbeatClient.getAllCandidatesFromLedger() ⇒
Get the governor in Evernode.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getAllCandidatesFromLedger</code>](#BaseEvernodeClient+getAllCandidatesFromLedger)  
**Returns**: The list of candidates.  
<a name="BaseEvernodeClient+pruneDeadHost"></a>

### heartbeatClient.pruneDeadHost(hostAddress)
Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>pruneDeadHost</code>](#BaseEvernodeClient+pruneDeadHost)  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to be pruned. |

<a name="BaseEvernodeClient+getCandidateByOwner"></a>

### heartbeatClient.getCandidateByOwner(ownerAddress) ⇒
Get proposed new hook candidate info.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getCandidateByOwner</code>](#BaseEvernodeClient+getCandidateByOwner)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | [Optional] Address of the owner. |

<a name="BaseEvernodeClient+getDudHostCandidatesByOwner"></a>

### heartbeatClient.getDudHostCandidatesByOwner(ownerAddress) ⇒
Get proposed dud host candidates.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getDudHostCandidatesByOwner</code>](#BaseEvernodeClient+getDudHostCandidatesByOwner)  
**Returns**: An array of candidate information. Returns empty array if no candidates.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | | Address of the owner |

<a name="BaseEvernodeClient+getCandidateById"></a>

### heartbeatClient.getCandidateById(candidateId) ⇒
Get candidate info.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getCandidateById</code>](#BaseEvernodeClient+getCandidateById)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate. |

<a name="BaseEvernodeClient+getDudHostVoteInfo"></a>

### heartbeatClient.getDudHostVoteInfo(hostAddress) ⇒
Get reported dud host info.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getDudHostVoteInfo</code>](#BaseEvernodeClient+getDudHostVoteInfo)  
**Returns**: The dud host candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the dud host. |

<a name="BaseEvernodeClient+getPilotedModeVoteInfo"></a>

### heartbeatClient.getPilotedModeVoteInfo() ⇒
Get piloted mode vote info.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getPilotedModeVoteInfo</code>](#BaseEvernodeClient+getPilotedModeVoteInfo)  
**Returns**: The piloted mode candidate information. Returns null if no candidate.  
<a name="BaseEvernodeClient+getReputationAddressByOrderedId"></a>

### heartbeatClient.getReputationAddressByOrderedId(orderedId, moment) ⇒
Get reputation order info of given orderedId.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getReputationAddressByOrderedId</code>](#BaseEvernodeClient+getReputationAddressByOrderedId)  
**Returns**: Reputation address info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| orderedId | <code>number</code> |  | Order id of the host. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationOrderByAddress"></a>

### heartbeatClient.getReputationOrderByAddress(hostAddress, moment) ⇒
Get reputation order info of given host.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getReputationOrderByAddress</code>](#BaseEvernodeClient+getReputationOrderByAddress)  
**Returns**: Reputation order info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hostAddress | <code>string</code> |  | (optional) Host address. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationContractInfoByAddress"></a>

### heartbeatClient.getReputationContractInfoByAddress(hostsAddress, moment) ⇒
Get reputation contract info of given host.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getReputationContractInfoByAddress</code>](#BaseEvernodeClient+getReputationContractInfoByAddress)  
**Returns**: Reputation contract info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |
| moment | <code>number</code> | (optional) Moment to get reputation contract info for. |

<a name="BaseEvernodeClient+getReputationInfoByAddress"></a>

### heartbeatClient.getReputationInfoByAddress(hostsAddress) ⇒
Get reputation info of given host.

**Kind**: instance method of [<code>HeartbeatClient</code>](#HeartbeatClient)  
**Overrides**: [<code>getReputationInfoByAddress</code>](#BaseEvernodeClient+getReputationInfoByAddress)  
**Returns**: Reputation info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |

<a name="HookClientFactory"></a>

## HookClientFactory
A factory class for creating different types of hook clients based on the provided hook type.

**Kind**: global class  
<a name="HookClientFactory.create"></a>

### HookClientFactory.create(hookType, [options]) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Creates a hook client from given type.

**Kind**: static method of [<code>HookClientFactory</code>](#HookClientFactory)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - - Returns a promise that resolves to an instance of the requested HookClient type, or `null` if the type is unsupported.  
**Throws**:

- <code>Error</code> Will throw an error if there is an issue connecting to the GovernorClient or obtaining the necessary configuration.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hookType | <code>string</code> |  | Type of the Required Hook. (Supported Hook types 'GOVERNOR', 'REGISTRY', 'HEARTBEAT' and 'REPUTATION') |
| [options] | <code>Object</code> | <code>{}</code> | Optional configuration for the hook client. |

<a name="RegistryClient"></a>

## RegistryClient ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
RegistryClient is responsible for managing registry operations in Evernode.
It interacts with the XRP Ledger using the registry address and listens for specific registry events.

**Kind**: global class  
**Extends**: [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

* [RegistryClient](#RegistryClient) ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
    * [.getActiveHostsFromLedger()](#RegistryClient+getActiveHostsFromLedger) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.on(event, handler)](#BaseEvernodeClient+on)
    * [.once(event, handler)](#BaseEvernodeClient+once)
    * [.off(event, handler)](#BaseEvernodeClient+off)
    * [.connect()](#BaseEvernodeClient+connect) ⇒
    * [.disconnect()](#BaseEvernodeClient+disconnect)
    * [.subscribe()](#BaseEvernodeClient+subscribe)
    * [.unsubscribe()](#BaseEvernodeClient+unsubscribe)
    * [.getEVRBalance()](#BaseEvernodeClient+getEVRBalance) ⇒
    * [.getHookStates()](#BaseEvernodeClient+getHookStates) ⇒
    * [.getMoment(index)](#BaseEvernodeClient+getMoment) ⇒
    * [.getMomentStartIndex(index)](#BaseEvernodeClient+getMomentStartIndex) ⇒
    * [.refreshConfig()](#BaseEvernodeClient+refreshConfig)
    * [.extractEvernodeEvent(tx)](#BaseEvernodeClient+extractEvernodeEvent) ⇒
    * [.getHostInfo(hostAddress)](#BaseEvernodeClient+getHostInfo) ⇒
    * [.getAllHostsFromLedger()](#BaseEvernodeClient+getAllHostsFromLedger) ⇒
    * [.getAllCandidatesFromLedger()](#BaseEvernodeClient+getAllCandidatesFromLedger) ⇒
    * [.pruneDeadHost(hostAddress)](#BaseEvernodeClient+pruneDeadHost)
    * [.getCandidateByOwner(ownerAddress)](#BaseEvernodeClient+getCandidateByOwner) ⇒
    * [.getDudHostCandidatesByOwner(ownerAddress)](#BaseEvernodeClient+getDudHostCandidatesByOwner) ⇒
    * [.getCandidateById(candidateId)](#BaseEvernodeClient+getCandidateById) ⇒
    * [.getDudHostVoteInfo(hostAddress)](#BaseEvernodeClient+getDudHostVoteInfo) ⇒
    * [.getPilotedModeVoteInfo()](#BaseEvernodeClient+getPilotedModeVoteInfo) ⇒
    * [.getReputationAddressByOrderedId(orderedId, moment)](#BaseEvernodeClient+getReputationAddressByOrderedId) ⇒
    * [.getReputationOrderByAddress(hostAddress, moment)](#BaseEvernodeClient+getReputationOrderByAddress) ⇒
    * [.getReputationContractInfoByAddress(hostsAddress, moment)](#BaseEvernodeClient+getReputationContractInfoByAddress) ⇒
    * [.getReputationInfoByAddress(hostsAddress)](#BaseEvernodeClient+getReputationInfoByAddress) ⇒

<a name="RegistryClient+getActiveHostsFromLedger"></a>

### registryClient.getActiveHostsFromLedger() ⇒ <code>Promise.&lt;Array&gt;</code>
Retrieves all active hosts registered in the ledger.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - - A promise that resolves to an array of active hosts.  
<a name="BaseEvernodeClient+on"></a>

### registryClient.on(event, handler)
Listens to the subscribed events. This will listen for the event without detaching the handler until it's 'off'.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>on</code>](#BaseEvernodeClient+on)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event to listen for. |
| handler | <code>function</code> | The callback function to handle the event. The function takes the event object as a parameter. |

<a name="BaseEvernodeClient+once"></a>

### registryClient.once(event, handler)
Listens to the subscribed events. This will listen only once and detach the handler.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>once</code>](#BaseEvernodeClient+once)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | Event name. |
| handler | <code>function</code> | Callback function to handle the event. |

<a name="BaseEvernodeClient+off"></a>

### registryClient.off(event, handler)
Detach the listener event.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>off</code>](#BaseEvernodeClient+off)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | Event name. |
| handler | <code>function</code> | <code></code> | (optional) Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified. |

<a name="BaseEvernodeClient+connect"></a>

### registryClient.connect() ⇒
Connects the client to xrpl server and do the config loading and subscriptions. 'subscribe' is called inside this.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>connect</code>](#BaseEvernodeClient+connect)  
**Returns**: Boolean value `true` if the connection is successful.  
<a name="BaseEvernodeClient+disconnect"></a>

### registryClient.disconnect()
Disconnects the client to xrpl server and do the un-subscriptions. 'unsubscribe' is called inside this.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>disconnect</code>](#BaseEvernodeClient+disconnect)  
<a name="BaseEvernodeClient+subscribe"></a>

### registryClient.subscribe()
Subscribes to the client events.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>subscribe</code>](#BaseEvernodeClient+subscribe)  
<a name="BaseEvernodeClient+unsubscribe"></a>

### registryClient.unsubscribe()
Unsubscribes from the client events.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>unsubscribe</code>](#BaseEvernodeClient+unsubscribe)  
<a name="BaseEvernodeClient+getEVRBalance"></a>

### registryClient.getEVRBalance() ⇒
Get the EVR balance in the account.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getEVRBalance</code>](#BaseEvernodeClient+getEVRBalance)  
**Returns**: The available EVR amount as a string.  
<a name="BaseEvernodeClient+getHookStates"></a>

### registryClient.getHookStates() ⇒
Get all XRPL hook states in the registry account.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getHookStates</code>](#BaseEvernodeClient+getHookStates)  
**Returns**: The list of hook states, including Evernode configuration and hosts.  
<a name="BaseEvernodeClient+getMoment"></a>

### registryClient.getMoment(index) ⇒
Get the moment from the given index (timestamp).

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getMoment</code>](#BaseEvernodeClient+getMoment)  
**Returns**: The moment of the given index (timestamp) as a number. Returns the current moment if the timestamp is not provided.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment value. |

<a name="BaseEvernodeClient+getMomentStartIndex"></a>

### registryClient.getMomentStartIndex(index) ⇒
Get start index (timestamp) of the moment.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getMomentStartIndex</code>](#BaseEvernodeClient+getMomentStartIndex)  
**Returns**: The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment start index. |

<a name="BaseEvernodeClient+refreshConfig"></a>

### registryClient.refreshConfig()
Loads the configs from XRPL hook and updates the in-memory config.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>refreshConfig</code>](#BaseEvernodeClient+refreshConfig)  
<a name="BaseEvernodeClient+extractEvernodeEvent"></a>

### registryClient.extractEvernodeEvent(tx) ⇒
Extracts the transaction info from a given transaction.
Note: You need to deserialize HookParameters before passing the transaction to this function.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>extractEvernodeEvent</code>](#BaseEvernodeClient+extractEvernodeEvent)  
**Returns**: The event object in format `{name: string, data: Object}`. Returns `null` if the event is not handled.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | The transaction object to be deserialized and extracted. |

<a name="BaseEvernodeClient+getHostInfo"></a>

### registryClient.getHostInfo(hostAddress) ⇒
Get the registered host information.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getHostInfo</code>](#BaseEvernodeClient+getHostInfo)  
**Returns**: The registered host information object. Returns null if not registered.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the host. |

<a name="BaseEvernodeClient+getAllHostsFromLedger"></a>

### registryClient.getAllHostsFromLedger() ⇒
Get the hosts registered in Evernode.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getAllHostsFromLedger</code>](#BaseEvernodeClient+getAllHostsFromLedger)  
**Returns**: The list of hosts.  
<a name="BaseEvernodeClient+getAllCandidatesFromLedger"></a>

### registryClient.getAllCandidatesFromLedger() ⇒
Get the governor in Evernode.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getAllCandidatesFromLedger</code>](#BaseEvernodeClient+getAllCandidatesFromLedger)  
**Returns**: The list of candidates.  
<a name="BaseEvernodeClient+pruneDeadHost"></a>

### registryClient.pruneDeadHost(hostAddress)
Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>pruneDeadHost</code>](#BaseEvernodeClient+pruneDeadHost)  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to be pruned. |

<a name="BaseEvernodeClient+getCandidateByOwner"></a>

### registryClient.getCandidateByOwner(ownerAddress) ⇒
Get proposed new hook candidate info.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getCandidateByOwner</code>](#BaseEvernodeClient+getCandidateByOwner)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | [Optional] Address of the owner. |

<a name="BaseEvernodeClient+getDudHostCandidatesByOwner"></a>

### registryClient.getDudHostCandidatesByOwner(ownerAddress) ⇒
Get proposed dud host candidates.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getDudHostCandidatesByOwner</code>](#BaseEvernodeClient+getDudHostCandidatesByOwner)  
**Returns**: An array of candidate information. Returns empty array if no candidates.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | | Address of the owner |

<a name="BaseEvernodeClient+getCandidateById"></a>

### registryClient.getCandidateById(candidateId) ⇒
Get candidate info.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getCandidateById</code>](#BaseEvernodeClient+getCandidateById)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate. |

<a name="BaseEvernodeClient+getDudHostVoteInfo"></a>

### registryClient.getDudHostVoteInfo(hostAddress) ⇒
Get reported dud host info.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getDudHostVoteInfo</code>](#BaseEvernodeClient+getDudHostVoteInfo)  
**Returns**: The dud host candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the dud host. |

<a name="BaseEvernodeClient+getPilotedModeVoteInfo"></a>

### registryClient.getPilotedModeVoteInfo() ⇒
Get piloted mode vote info.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getPilotedModeVoteInfo</code>](#BaseEvernodeClient+getPilotedModeVoteInfo)  
**Returns**: The piloted mode candidate information. Returns null if no candidate.  
<a name="BaseEvernodeClient+getReputationAddressByOrderedId"></a>

### registryClient.getReputationAddressByOrderedId(orderedId, moment) ⇒
Get reputation order info of given orderedId.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getReputationAddressByOrderedId</code>](#BaseEvernodeClient+getReputationAddressByOrderedId)  
**Returns**: Reputation address info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| orderedId | <code>number</code> |  | Order id of the host. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationOrderByAddress"></a>

### registryClient.getReputationOrderByAddress(hostAddress, moment) ⇒
Get reputation order info of given host.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getReputationOrderByAddress</code>](#BaseEvernodeClient+getReputationOrderByAddress)  
**Returns**: Reputation order info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hostAddress | <code>string</code> |  | (optional) Host address. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationContractInfoByAddress"></a>

### registryClient.getReputationContractInfoByAddress(hostsAddress, moment) ⇒
Get reputation contract info of given host.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getReputationContractInfoByAddress</code>](#BaseEvernodeClient+getReputationContractInfoByAddress)  
**Returns**: Reputation contract info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |
| moment | <code>number</code> | (optional) Moment to get reputation contract info for. |

<a name="BaseEvernodeClient+getReputationInfoByAddress"></a>

### registryClient.getReputationInfoByAddress(hostsAddress) ⇒
Get reputation info of given host.

**Kind**: instance method of [<code>RegistryClient</code>](#RegistryClient)  
**Overrides**: [<code>getReputationInfoByAddress</code>](#BaseEvernodeClient+getReputationInfoByAddress)  
**Returns**: Reputation info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |

<a name="HostClient"></a>

## HostClient ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
HostClient class to manage host operations.
It extends the BaseEvernodeClient.

**Kind**: global class  
**Extends**: [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

* [HostClient](#HostClient) ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
    * [new HostClient(xrpAddress, xrpSecret, [options])](#new_HostClient_new)
    * [.getRegistrationUriToken()](#HostClient+getRegistrationUriToken) ⇒
    * [.getRegistration()](#HostClient+getRegistration) ⇒
    * [.getLeaseByIndex(index)](#HostClient+getLeaseByIndex) ⇒
    * [.getLeases()](#HostClient+getLeases) ⇒
    * [.getLeaseOffers()](#HostClient+getLeaseOffers) ⇒
    * [.getUnofferedLeases()](#HostClient+getUnofferedLeases) ⇒
    * [.isRegistered()](#HostClient+isRegistered) ⇒
    * [.prepareAccount(domain)](#HostClient+prepareAccount)
    * [.prepareReputationAccount(reputationAddress, reputationSecret)](#HostClient+prepareReputationAccount)
    * [.setReputationContractInfo(peerPort, publicKey)](#HostClient+setReputationContractInfo)
    * [.getReputationInfo(moment)](#HostClient+getReputationInfo) ⇒
    * [.prepareHostReputationScores(scoreVersion, clusterSize, collectedScores)](#HostClient+prepareHostReputationScores) ⇒
    * [.sendReputations(bufferHex)](#HostClient+sendReputations)
    * [.offerLease(leaseIndex, leaseAmount, tosHash, outboundIPAddress)](#HostClient+offerLease)
    * [.mintLease(leaseIndex, leaseAmount, tosHash, outboundIPAddress)](#HostClient+mintLease)
    * [.offerMintedLease(uriTokenId, leaseAmount)](#HostClient+offerMintedLease)
    * [.expireLease(uriTokenId)](#HostClient+expireLease)
    * [.acceptRegToken(options)](#HostClient+acceptRegToken) ⇒
    * [.register(countryCode, cpuMicroSec, ramMb, diskMb, totalInstanceCount, cpuModel, cpuCount, cpuSpeed, description, emailAddress, leaseAmount, options)](#HostClient+register) ⇒
    * [.deregister(error, options)](#HostClient+deregister) ⇒
    * [.updateRegInfo(activeInstanceCount, version, totalInstanceCount, tokenID, countryCode, cpuMicroSec, ramMb, diskMb, description, emailAddress, leaseAmount, options)](#HostClient+updateRegInfo) ⇒
    * [.heartbeat(voteInfo, options)](#HostClient+heartbeat) ⇒
    * [.acquireSuccess(txHash, tenantAddress, instanceInfo, options)](#HostClient+acquireSuccess) ⇒
    * [.acquireError(txHash, tenantAddress, leaseAmount, reason, options)](#HostClient+acquireError) ⇒
    * [.extendSuccess(txHash, tenantAddress, expiryMoment, options)](#HostClient+extendSuccess) ⇒
    * [.extendError(txHash, tenantAddress, reason, refund, options)](#HostClient+extendError) ⇒
    * [.refundTenant(txHash, tenantAddress, refundAmount, options)](#HostClient+refundTenant) ⇒
    * [.requestRebate(options)](#HostClient+requestRebate) ⇒
    * [.transfer(transfereeAddress, options)](#HostClient+transfer)
    * [.isTransferee()](#HostClient+isTransferee) ⇒
    * [.propose(hashes, shortName, options)](#HostClient+propose) ⇒
    * [.withdraw(candidateId, options)](#HostClient+withdraw) ⇒
    * [.reportDudHost(hostAddress, options)](#HostClient+reportDudHost) ⇒
    * [.on(event, handler)](#BaseEvernodeClient+on)
    * [.once(event, handler)](#BaseEvernodeClient+once)
    * [.off(event, handler)](#BaseEvernodeClient+off)
    * [.connect()](#BaseEvernodeClient+connect) ⇒
    * [.disconnect()](#BaseEvernodeClient+disconnect)
    * [.subscribe()](#BaseEvernodeClient+subscribe)
    * [.unsubscribe()](#BaseEvernodeClient+unsubscribe)
    * [.getEVRBalance()](#BaseEvernodeClient+getEVRBalance) ⇒
    * [.getHookStates()](#BaseEvernodeClient+getHookStates) ⇒
    * [.getMoment(index)](#BaseEvernodeClient+getMoment) ⇒
    * [.getMomentStartIndex(index)](#BaseEvernodeClient+getMomentStartIndex) ⇒
    * [.refreshConfig()](#BaseEvernodeClient+refreshConfig)
    * [.extractEvernodeEvent(tx)](#BaseEvernodeClient+extractEvernodeEvent) ⇒
    * [.getHostInfo(hostAddress)](#BaseEvernodeClient+getHostInfo) ⇒
    * [.getAllHostsFromLedger()](#BaseEvernodeClient+getAllHostsFromLedger) ⇒
    * [.getAllCandidatesFromLedger()](#BaseEvernodeClient+getAllCandidatesFromLedger) ⇒
    * [.pruneDeadHost(hostAddress)](#BaseEvernodeClient+pruneDeadHost)
    * [.getCandidateByOwner(ownerAddress)](#BaseEvernodeClient+getCandidateByOwner) ⇒
    * [.getDudHostCandidatesByOwner(ownerAddress)](#BaseEvernodeClient+getDudHostCandidatesByOwner) ⇒
    * [.getCandidateById(candidateId)](#BaseEvernodeClient+getCandidateById) ⇒
    * [.getDudHostVoteInfo(hostAddress)](#BaseEvernodeClient+getDudHostVoteInfo) ⇒
    * [.getPilotedModeVoteInfo()](#BaseEvernodeClient+getPilotedModeVoteInfo) ⇒
    * [.getReputationAddressByOrderedId(orderedId, moment)](#BaseEvernodeClient+getReputationAddressByOrderedId) ⇒
    * [.getReputationOrderByAddress(hostAddress, moment)](#BaseEvernodeClient+getReputationOrderByAddress) ⇒
    * [.getReputationContractInfoByAddress(hostsAddress, moment)](#BaseEvernodeClient+getReputationContractInfoByAddress) ⇒
    * [.getReputationInfoByAddress(hostsAddress)](#BaseEvernodeClient+getReputationInfoByAddress) ⇒

<a name="new_HostClient_new"></a>

### new HostClient(xrpAddress, xrpSecret, [options])
Creates an instance of HostClient.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| xrpAddress | <code>string</code> |  | The XRP address to associate with this client. |
| xrpSecret | <code>string</code> |  | The secret (private key) associated with the XRP address. |
| [options] | <code>Object</code> | <code>{}</code> | Additional configuration options for the HostClient. |

<a name="HostClient+getRegistrationUriToken"></a>

### hostClient.getRegistrationUriToken() ⇒
Get registration URI token info.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: The registration URI token object.  
<a name="HostClient+getRegistration"></a>

### hostClient.getRegistration() ⇒
Get host info if registered.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Host info object if registered, Otherwise null.  
<a name="HostClient+getLeaseByIndex"></a>

### hostClient.getLeaseByIndex(index) ⇒
Get lease token by index.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Lease token.  

| Param | Description |
| --- | --- |
| index | Index of the token. |

<a name="HostClient+getLeases"></a>

### hostClient.getLeases() ⇒
Get offered and unoffered leases created by the host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Array of lease offer objects.  
<a name="HostClient+getLeaseOffers"></a>

### hostClient.getLeaseOffers() ⇒
Get lease offers created by the host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Array of lease offer objects.  
<a name="HostClient+getUnofferedLeases"></a>

### hostClient.getUnofferedLeases() ⇒
Get unoffered leases created by the host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Array of lease objects.  
<a name="HostClient+isRegistered"></a>

### hostClient.isRegistered() ⇒
Check wether the host is registered.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Boolean if the host is registered or not.  
<a name="HostClient+prepareAccount"></a>

### hostClient.prepareAccount(domain)
Prepare the host account with account fields and trust lines.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Description |
| --- | --- | --- |
| domain | <code>string</code> | Domain which the host machine is reachable. |

<a name="HostClient+prepareReputationAccount"></a>

### hostClient.prepareReputationAccount(reputationAddress, reputationSecret)
Prepare the reputation account with account fields and trust lines.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Description |
| --- | --- | --- |
| reputationAddress | <code>string</code> | Address of the reputation account. |
| reputationSecret | <code>string</code> | Secret of the reputation account. |

<a name="HostClient+setReputationContractInfo"></a>

### hostClient.setReputationContractInfo(peerPort, publicKey)
Set the reputation contract info.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Description |
| --- | --- | --- |
| peerPort | <code>number</code> | Peer port of the reputation contract instance. |
| publicKey | <code>string</code> | Public key of the reputation contract instance. |

<a name="HostClient+getReputationInfo"></a>

### hostClient.getReputationInfo(moment) ⇒
Get reputation info of this host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Reputation info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="HostClient+prepareHostReputationScores"></a>

### hostClient.prepareHostReputationScores(scoreVersion, clusterSize, collectedScores) ⇒
Prepare host reputation score to a common format for submission.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Unified reputation score buffer.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| scoreVersion | <code>number</code> |  | Version of the scores. |
| clusterSize | <code>number</code> |  | Size of the cluster. |
| collectedScores | <code>object</code> | <code></code> | [Optional] Score object in { host: score } format. |

<a name="HostClient+sendReputations"></a>

### hostClient.sendReputations(bufferHex)
Send reputation scores to the reputation hook.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Description |
| --- | --- | --- |
| bufferHex | <code>string</code> | Prepared score buffer as hex string. |

<a name="HostClient+offerLease"></a>

### hostClient.offerLease(leaseIndex, leaseAmount, tosHash, outboundIPAddress)
Create a lease offer.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| leaseIndex | <code>number</code> |  | Index number for the lease. |
| leaseAmount | <code>number</code> |  | Amount (EVRs) of the lease offer. |
| tosHash | <code>string</code> |  | Hex hash of the Terms Of Service text. |
| outboundIPAddress | <code>string</code> | <code>null</code> | Assigned IP Address. |

<a name="HostClient+mintLease"></a>

### hostClient.mintLease(leaseIndex, leaseAmount, tosHash, outboundIPAddress)
Mint a lease offer.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| leaseIndex | <code>number</code> |  | Index number for the lease. |
| leaseAmount | <code>number</code> |  | Amount (EVRs) of the lease offer. |
| tosHash | <code>string</code> |  | Hex hash of the Terms Of Service text. |
| outboundIPAddress | <code>string</code> | <code>null</code> | Assigned IP Address. |

<a name="HostClient+offerMintedLease"></a>

### hostClient.offerMintedLease(uriTokenId, leaseAmount)
Create a lease offer.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Description |
| --- | --- | --- |
| uriTokenId | <code>number</code> | Id of the token. |
| leaseAmount | <code>number</code> | Amount (EVRs) of the lease offer. |

<a name="HostClient+expireLease"></a>

### hostClient.expireLease(uriTokenId)
Expire the lease offer.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Description |
| --- | --- | --- |
| uriTokenId | <code>string</code> | Hex URI token id of the lease. |

<a name="HostClient+acceptRegToken"></a>

### hostClient.acceptRegToken(options) ⇒
Accepts if there's an available reg token.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: True if there were reg token and it's accepted, Otherwise false.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+register"></a>

### hostClient.register(countryCode, cpuMicroSec, ramMb, diskMb, totalInstanceCount, cpuModel, cpuCount, cpuSpeed, description, emailAddress, leaseAmount, options) ⇒
Register the host in the Evernode network.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| countryCode | <code>string</code> | Upper case country code with two letters. |
| cpuMicroSec | <code>number</code> | CPU cycle in micro seconds of the host. |
| ramMb | <code>number</code> | Ram size in mega bytes. |
| diskMb | <code>number</code> | Disk size in mega bytes. |
| totalInstanceCount | <code>number</code> | Total number of instance slots in the host. |
| cpuModel | <code>string</code> | Model of the host CPU. |
| cpuCount | <code>number</code> | Number of CPUs in the host. |
| cpuSpeed | <code>number</code> | CPU MHz. |
| description | <code>string</code> | Description about the host. |
| emailAddress | <code>string</code> | Email address of the host. |
| leaseAmount | <code>number</code> | Lease fee of the host. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+deregister"></a>

### hostClient.deregister(error, options) ⇒
Deregister a host from the Evernode network.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Boolean whether host is registered or not.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| error | <code>string</code> | <code>null</code> | [Optional] Error. |
| options | <code>\*</code> |  | [Optional] transaction options. |

<a name="HostClient+updateRegInfo"></a>

### hostClient.updateRegInfo(activeInstanceCount, version, totalInstanceCount, tokenID, countryCode, cpuMicroSec, ramMb, diskMb, description, emailAddress, leaseAmount, options) ⇒
Update the host registration in the Evernode network.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| activeInstanceCount | <code>number</code> | <code></code> | Currently active instance count in the host. |
| version | <code>string</code> | <code>null</code> | Sashimono version installed on the host |
| totalInstanceCount | <code>number</code> | <code></code> | Total number of instance slots in the host. |
| tokenID | <code>string</code> | <code>null</code> | Registration Token Id of the host. |
| countryCode | <code>string</code> | <code>null</code> | Upper case country code with two letters. |
| cpuMicroSec | <code>number</code> | <code></code> |  |
| ramMb | <code>number</code> | <code></code> | Ram size in mega bytes. |
| diskMb | <code>number</code> | <code></code> | Disk size in mega bytes. |
| description | <code>string</code> | <code>null</code> | Description about the host. |
| emailAddress | <code>string</code> | <code>null</code> | Email address of the host. |
| leaseAmount | <code>number</code> | <code></code> | Lease fee of the host. |
| options | <code>\*</code> |  | [Optional] transaction options. |

<a name="HostClient+heartbeat"></a>

### hostClient.heartbeat(voteInfo, options) ⇒
Send a heartbeat from the host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| voteInfo | <code>\*</code> | [Optional] Candidate votes if there's any `{ '<candidateId>': '{number 0|1} vote', ... }` |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+acquireSuccess"></a>

### hostClient.acquireSuccess(txHash, tenantAddress, instanceInfo, options) ⇒
Send acquire success response to the tenant.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| txHash | <code>string</code> | Acquire lease transaction hash in hex. |
| tenantAddress | <code>string</code> | XRPL address of the tenant. |
| instanceInfo | <code>string</code> | Created instance info. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+acquireError"></a>

### hostClient.acquireError(txHash, tenantAddress, leaseAmount, reason, options) ⇒
Send acquire error response to the tenant.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| txHash | <code>string</code> | Acquire lease transaction hash in hex. |
| tenantAddress | <code>string</code> | Xrpl address of the tenant. |
| leaseAmount | <code>number</code> | Lease amount to be refunded. |
| reason | <code>string</code> | Reason for the error. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+extendSuccess"></a>

### hostClient.extendSuccess(txHash, tenantAddress, expiryMoment, options) ⇒
Send extend success response to the tenant.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| txHash | <code>string</code> | Extend lease transaction hash in hex. |
| tenantAddress | <code>string</code> | XRPL address of the tenant. |
| expiryMoment | <code>number</code> | Moment which the instance will expire. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+extendError"></a>

### hostClient.extendError(txHash, tenantAddress, reason, refund, options) ⇒
Send extend error response to the tenant.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| txHash | <code>string</code> | Extend lease transaction hash in hex. |
| tenantAddress | <code>string</code> | Xrpl address of the tenant. |
| reason | <code>string</code> | Reason for the error. |
| refund | <code>number</code> | Amount to be refunded. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+refundTenant"></a>

### hostClient.refundTenant(txHash, tenantAddress, refundAmount, options) ⇒
Send refunds to the tenant.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| txHash | <code>string</code> | Request transaction hash in hex. |
| tenantAddress | <code>string</code> | Xrpl address of the tenant. |
| refundAmount | <code>number</code> | Amount to be refunded. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+requestRebate"></a>

### hostClient.requestRebate(options) ⇒
Request registration rebates from the registry.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+transfer"></a>

### hostClient.transfer(transfereeAddress, options)
Initiate a host transfer.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  

| Param | Type | Description |
| --- | --- | --- |
| transfereeAddress | <code>string</code> | [Optional] Xrpl account address to host registration to be transferred. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+isTransferee"></a>

### hostClient.isTransferee() ⇒
Check whether this host is a transferee.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Boolean wether the host is a transferee or not.  
<a name="HostClient+propose"></a>

### hostClient.propose(hashes, shortName, options) ⇒
Propose a new hook candidate.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Proposed candidate id.  

| Param | Type | Description |
| --- | --- | --- |
| hashes | <code>string</code> | Hook candidate hashes in hex format, <GOVERNOR_HASH(32)><REGISTRY_HASH(32)><HEARTBEAT_HASH(32)>. |
| shortName | <code>string</code> | Short name for the proposal candidate. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+withdraw"></a>

### hostClient.withdraw(candidateId, options) ⇒
Withdraw a hook candidate.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate in hex format. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="HostClient+reportDudHost"></a>

### hostClient.reportDudHost(hostAddress, options) ⇒
Report dud host for removal.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Returns**: Transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | Address of the dud host. |
| options | <code>\*</code> | [Optional] transaction options. |

<a name="BaseEvernodeClient+on"></a>

### hostClient.on(event, handler)
Listens to the subscribed events. This will listen for the event without detaching the handler until it's 'off'.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>on</code>](#BaseEvernodeClient+on)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event to listen for. |
| handler | <code>function</code> | The callback function to handle the event. The function takes the event object as a parameter. |

<a name="BaseEvernodeClient+once"></a>

### hostClient.once(event, handler)
Listens to the subscribed events. This will listen only once and detach the handler.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>once</code>](#BaseEvernodeClient+once)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | Event name. |
| handler | <code>function</code> | Callback function to handle the event. |

<a name="BaseEvernodeClient+off"></a>

### hostClient.off(event, handler)
Detach the listener event.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>off</code>](#BaseEvernodeClient+off)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | Event name. |
| handler | <code>function</code> | <code></code> | (optional) Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified. |

<a name="BaseEvernodeClient+connect"></a>

### hostClient.connect() ⇒
Connects the client to xrpl server and do the config loading and subscriptions. 'subscribe' is called inside this.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>connect</code>](#BaseEvernodeClient+connect)  
**Returns**: Boolean value `true` if the connection is successful.  
<a name="BaseEvernodeClient+disconnect"></a>

### hostClient.disconnect()
Disconnects the client to xrpl server and do the un-subscriptions. 'unsubscribe' is called inside this.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>disconnect</code>](#BaseEvernodeClient+disconnect)  
<a name="BaseEvernodeClient+subscribe"></a>

### hostClient.subscribe()
Subscribes to the client events.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>subscribe</code>](#BaseEvernodeClient+subscribe)  
<a name="BaseEvernodeClient+unsubscribe"></a>

### hostClient.unsubscribe()
Unsubscribes from the client events.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>unsubscribe</code>](#BaseEvernodeClient+unsubscribe)  
<a name="BaseEvernodeClient+getEVRBalance"></a>

### hostClient.getEVRBalance() ⇒
Get the EVR balance in the account.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getEVRBalance</code>](#BaseEvernodeClient+getEVRBalance)  
**Returns**: The available EVR amount as a string.  
<a name="BaseEvernodeClient+getHookStates"></a>

### hostClient.getHookStates() ⇒
Get all XRPL hook states in the registry account.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getHookStates</code>](#BaseEvernodeClient+getHookStates)  
**Returns**: The list of hook states, including Evernode configuration and hosts.  
<a name="BaseEvernodeClient+getMoment"></a>

### hostClient.getMoment(index) ⇒
Get the moment from the given index (timestamp).

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getMoment</code>](#BaseEvernodeClient+getMoment)  
**Returns**: The moment of the given index (timestamp) as a number. Returns the current moment if the timestamp is not provided.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment value. |

<a name="BaseEvernodeClient+getMomentStartIndex"></a>

### hostClient.getMomentStartIndex(index) ⇒
Get start index (timestamp) of the moment.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getMomentStartIndex</code>](#BaseEvernodeClient+getMomentStartIndex)  
**Returns**: The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment start index. |

<a name="BaseEvernodeClient+refreshConfig"></a>

### hostClient.refreshConfig()
Loads the configs from XRPL hook and updates the in-memory config.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>refreshConfig</code>](#BaseEvernodeClient+refreshConfig)  
<a name="BaseEvernodeClient+extractEvernodeEvent"></a>

### hostClient.extractEvernodeEvent(tx) ⇒
Extracts the transaction info from a given transaction.
Note: You need to deserialize HookParameters before passing the transaction to this function.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>extractEvernodeEvent</code>](#BaseEvernodeClient+extractEvernodeEvent)  
**Returns**: The event object in format `{name: string, data: Object}`. Returns `null` if the event is not handled.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | The transaction object to be deserialized and extracted. |

<a name="BaseEvernodeClient+getHostInfo"></a>

### hostClient.getHostInfo(hostAddress) ⇒
Get the registered host information.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getHostInfo</code>](#BaseEvernodeClient+getHostInfo)  
**Returns**: The registered host information object. Returns null if not registered.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the host. |

<a name="BaseEvernodeClient+getAllHostsFromLedger"></a>

### hostClient.getAllHostsFromLedger() ⇒
Get the hosts registered in Evernode.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getAllHostsFromLedger</code>](#BaseEvernodeClient+getAllHostsFromLedger)  
**Returns**: The list of hosts.  
<a name="BaseEvernodeClient+getAllCandidatesFromLedger"></a>

### hostClient.getAllCandidatesFromLedger() ⇒
Get the governor in Evernode.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getAllCandidatesFromLedger</code>](#BaseEvernodeClient+getAllCandidatesFromLedger)  
**Returns**: The list of candidates.  
<a name="BaseEvernodeClient+pruneDeadHost"></a>

### hostClient.pruneDeadHost(hostAddress)
Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>pruneDeadHost</code>](#BaseEvernodeClient+pruneDeadHost)  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to be pruned. |

<a name="BaseEvernodeClient+getCandidateByOwner"></a>

### hostClient.getCandidateByOwner(ownerAddress) ⇒
Get proposed new hook candidate info.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getCandidateByOwner</code>](#BaseEvernodeClient+getCandidateByOwner)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | [Optional] Address of the owner. |

<a name="BaseEvernodeClient+getDudHostCandidatesByOwner"></a>

### hostClient.getDudHostCandidatesByOwner(ownerAddress) ⇒
Get proposed dud host candidates.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getDudHostCandidatesByOwner</code>](#BaseEvernodeClient+getDudHostCandidatesByOwner)  
**Returns**: An array of candidate information. Returns empty array if no candidates.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | | Address of the owner |

<a name="BaseEvernodeClient+getCandidateById"></a>

### hostClient.getCandidateById(candidateId) ⇒
Get candidate info.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getCandidateById</code>](#BaseEvernodeClient+getCandidateById)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate. |

<a name="BaseEvernodeClient+getDudHostVoteInfo"></a>

### hostClient.getDudHostVoteInfo(hostAddress) ⇒
Get reported dud host info.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getDudHostVoteInfo</code>](#BaseEvernodeClient+getDudHostVoteInfo)  
**Returns**: The dud host candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the dud host. |

<a name="BaseEvernodeClient+getPilotedModeVoteInfo"></a>

### hostClient.getPilotedModeVoteInfo() ⇒
Get piloted mode vote info.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getPilotedModeVoteInfo</code>](#BaseEvernodeClient+getPilotedModeVoteInfo)  
**Returns**: The piloted mode candidate information. Returns null if no candidate.  
<a name="BaseEvernodeClient+getReputationAddressByOrderedId"></a>

### hostClient.getReputationAddressByOrderedId(orderedId, moment) ⇒
Get reputation order info of given orderedId.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getReputationAddressByOrderedId</code>](#BaseEvernodeClient+getReputationAddressByOrderedId)  
**Returns**: Reputation address info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| orderedId | <code>number</code> |  | Order id of the host. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationOrderByAddress"></a>

### hostClient.getReputationOrderByAddress(hostAddress, moment) ⇒
Get reputation order info of given host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getReputationOrderByAddress</code>](#BaseEvernodeClient+getReputationOrderByAddress)  
**Returns**: Reputation order info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hostAddress | <code>string</code> |  | (optional) Host address. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationContractInfoByAddress"></a>

### hostClient.getReputationContractInfoByAddress(hostsAddress, moment) ⇒
Get reputation contract info of given host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getReputationContractInfoByAddress</code>](#BaseEvernodeClient+getReputationContractInfoByAddress)  
**Returns**: Reputation contract info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |
| moment | <code>number</code> | (optional) Moment to get reputation contract info for. |

<a name="BaseEvernodeClient+getReputationInfoByAddress"></a>

### hostClient.getReputationInfoByAddress(hostsAddress) ⇒
Get reputation info of given host.

**Kind**: instance method of [<code>HostClient</code>](#HostClient)  
**Overrides**: [<code>getReputationInfoByAddress</code>](#BaseEvernodeClient+getReputationInfoByAddress)  
**Returns**: Reputation info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |

<a name="TenantClient"></a>

## TenantClient ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
TenantClient class to manage tenant operations.
It extends the BaseEvernodeClient.

**Kind**: global class  
**Extends**: [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)  

* [TenantClient](#TenantClient) ⇐ [<code>BaseEvernodeClient</code>](#BaseEvernodeClient)
    * [new TenantClient(xrpAddress, xrpSecret, [options])](#new_TenantClient_new)
    * [.prepareAccount([options])](#TenantClient+prepareAccount)
    * [.getLeaseHost(hostAddress)](#TenantClient+getLeaseHost) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.acquireLeaseSubmit(hostAddress, requirement, options)](#TenantClient+acquireLeaseSubmit) ⇒
    * [.prepareAcquireLeaseTransaction(hostAddress, requirement, options)](#TenantClient+prepareAcquireLeaseTransaction) ⇒
    * [.watchAcquireResponse(tx, options)](#TenantClient+watchAcquireResponse) ⇒
    * [.acquireLease(hostAddress, requirement, options)](#TenantClient+acquireLease) ⇒
    * [.extendLeaseSubmit(hostAddress, amount, tokenID, options)](#TenantClient+extendLeaseSubmit) ⇒
    * [.prepareExtendLeaseTransaction(hostAddress, amount, tokenID, options)](#TenantClient+prepareExtendLeaseTransaction) ⇒
    * [.watchExtendResponse(tx, options)](#TenantClient+watchExtendResponse) ⇒
    * [.extendLease(hostAddress, moments, instanceName, options)](#TenantClient+extendLease) ⇒
    * [.terminateLease(uriTokenId)](#TenantClient+terminateLease)
    * [.on(event, handler)](#BaseEvernodeClient+on)
    * [.once(event, handler)](#BaseEvernodeClient+once)
    * [.off(event, handler)](#BaseEvernodeClient+off)
    * [.connect()](#BaseEvernodeClient+connect) ⇒
    * [.disconnect()](#BaseEvernodeClient+disconnect)
    * [.subscribe()](#BaseEvernodeClient+subscribe)
    * [.unsubscribe()](#BaseEvernodeClient+unsubscribe)
    * [.getEVRBalance()](#BaseEvernodeClient+getEVRBalance) ⇒
    * [.getHookStates()](#BaseEvernodeClient+getHookStates) ⇒
    * [.getMoment(index)](#BaseEvernodeClient+getMoment) ⇒
    * [.getMomentStartIndex(index)](#BaseEvernodeClient+getMomentStartIndex) ⇒
    * [.refreshConfig()](#BaseEvernodeClient+refreshConfig)
    * [.extractEvernodeEvent(tx)](#BaseEvernodeClient+extractEvernodeEvent) ⇒
    * [.getHostInfo(hostAddress)](#BaseEvernodeClient+getHostInfo) ⇒
    * [.getAllHostsFromLedger()](#BaseEvernodeClient+getAllHostsFromLedger) ⇒
    * [.getAllCandidatesFromLedger()](#BaseEvernodeClient+getAllCandidatesFromLedger) ⇒
    * [.pruneDeadHost(hostAddress)](#BaseEvernodeClient+pruneDeadHost)
    * [.getCandidateByOwner(ownerAddress)](#BaseEvernodeClient+getCandidateByOwner) ⇒
    * [.getDudHostCandidatesByOwner(ownerAddress)](#BaseEvernodeClient+getDudHostCandidatesByOwner) ⇒
    * [.getCandidateById(candidateId)](#BaseEvernodeClient+getCandidateById) ⇒
    * [.getDudHostVoteInfo(hostAddress)](#BaseEvernodeClient+getDudHostVoteInfo) ⇒
    * [.getPilotedModeVoteInfo()](#BaseEvernodeClient+getPilotedModeVoteInfo) ⇒
    * [.getReputationAddressByOrderedId(orderedId, moment)](#BaseEvernodeClient+getReputationAddressByOrderedId) ⇒
    * [.getReputationOrderByAddress(hostAddress, moment)](#BaseEvernodeClient+getReputationOrderByAddress) ⇒
    * [.getReputationContractInfoByAddress(hostsAddress, moment)](#BaseEvernodeClient+getReputationContractInfoByAddress) ⇒
    * [.getReputationInfoByAddress(hostsAddress)](#BaseEvernodeClient+getReputationInfoByAddress) ⇒

<a name="new_TenantClient_new"></a>

### new TenantClient(xrpAddress, xrpSecret, [options])
Creates an instance of TenantClient.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| xrpAddress | <code>string</code> |  | The XRP address to associate with this client. |
| xrpSecret | <code>string</code> |  | The secret (private key) associated with the XRP address. |
| [options] | <code>Object</code> | <code>{}</code> | Additional configuration options for the TenantClient. |

<a name="TenantClient+prepareAccount"></a>

### tenantClient.prepareAccount([options])
Prepare the tenant account with account fields and trust lines.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> | <code>{}</code> | Optional configuration for the account setup. |

<a name="TenantClient+getLeaseHost"></a>

### tenantClient.getLeaseHost(hostAddress) ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves and validates a lease host based on the given host address.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - Returns the host object if valid and active.  
**Throws**:

- Will throw an error if the host is invalid, inactive, or not registered.


| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | The XRP Ledger address of the host. |

<a name="TenantClient+acquireLeaseSubmit"></a>

### tenantClient.acquireLeaseSubmit(hostAddress, requirement, options) ⇒
Prepare and submit acquire transaction.(Single signed scenario)

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: The transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to acquire the lease. |
| requirement | <code>object</code> | The instance requirements and configuration. |
| options | <code>object</code> | [Optional] Options for the XRPL transaction. |

<a name="TenantClient+prepareAcquireLeaseTransaction"></a>

### tenantClient.prepareAcquireLeaseTransaction(hostAddress, requirement, options) ⇒
Prepare the Acquire transaction.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: Prepared Acquire transaction.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to acquire the lease. |
| requirement | <code>object</code> | The instance requirements and configuration. |
| options | <code>object</code> | [Optional] Options for the XRPL transaction. |

<a name="TenantClient+watchAcquireResponse"></a>

### tenantClient.watchAcquireResponse(tx, options) ⇒
Watch for the acquire-success response after the acquire request is made.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: An object including transaction details,instance info, and acquireReference Id.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | The transaction returned by the acquireLeaseSubmit function. |
| options | <code>object</code> | [Optional] Options for the XRPL transaction. |

<a name="TenantClient+acquireLease"></a>

### tenantClient.acquireLease(hostAddress, requirement, options) ⇒
Acquire an instance from a host

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: An object including transaction details,instance info, and acquireReference Id.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to acquire the lease. |
| requirement | <code>object</code> | The instance requirements and configuration. |
| options | <code>object</code> | [Optional] Options for the XRPL transaction. |

<a name="TenantClient+extendLeaseSubmit"></a>

### tenantClient.extendLeaseSubmit(hostAddress, amount, tokenID, options) ⇒
This function is called by a tenant client to submit the extend lease transaction in certain host. This function will be called inside extendLease function. This function can take four parameters as follows.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: The transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL account address of the host. |
| amount | <code>number</code> | Cost for the extended moments , in EVRs. |
| tokenID | <code>string</code> | Tenant received instance name. this name can be retrieve by performing acquire Lease. |
| options | <code>object</code> | This is an optional field and contains necessary details for the transactions. |

<a name="TenantClient+prepareExtendLeaseTransaction"></a>

### tenantClient.prepareExtendLeaseTransaction(hostAddress, amount, tokenID, options) ⇒
This function is called to prepare an instance extension transaction for a particular host.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: The prepared transaction.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL account address of the host. |
| amount | <code>number</code> | Cost for the extended moments , in EVRs. |
| tokenID | <code>string</code> | Tenant received instance name. this name can be retrieve by performing acquire Lease. |
| options | <code>object</code> | This is an optional field and contains necessary details for the transactions. |

<a name="TenantClient+watchExtendResponse"></a>

### tenantClient.watchExtendResponse(tx, options) ⇒
This function watches for an extendlease-success response(transaction) and returns the response or throws the error response on extendlease-error response from the host XRPL account. This function is called within the extendLease function.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: An object including transaction details.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | Response of extendLeaseSubmit. |
| options | <code>object</code> | This is an optional field and contains necessary details for the transactions. |

<a name="TenantClient+extendLease"></a>

### tenantClient.extendLease(hostAddress, moments, instanceName, options) ⇒
This function is called by a tenant client to extend an available instance in certain host. This function can take four parameters as follows.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Returns**: An object including transaction details.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL account address of the host. |
| moments | <code>number</code> | 1190 ledgers (est. 1 hour). |
| instanceName | <code>string</code> | Tenant received instance name. this name can be retrieve by performing acquire Lease. |
| options | <code>object</code> | This is an optional field and contains necessary details for the transactions. |

<a name="TenantClient+terminateLease"></a>

### tenantClient.terminateLease(uriTokenId)
Terminate the lease instance.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  

| Param | Type | Description |
| --- | --- | --- |
| uriTokenId | <code>string</code> | Hex URI token id of the lease. |

<a name="BaseEvernodeClient+on"></a>

### tenantClient.on(event, handler)
Listens to the subscribed events. This will listen for the event without detaching the handler until it's 'off'.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>on</code>](#BaseEvernodeClient+on)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event to listen for. |
| handler | <code>function</code> | The callback function to handle the event. The function takes the event object as a parameter. |

<a name="BaseEvernodeClient+once"></a>

### tenantClient.once(event, handler)
Listens to the subscribed events. This will listen only once and detach the handler.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>once</code>](#BaseEvernodeClient+once)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | Event name. |
| handler | <code>function</code> | Callback function to handle the event. |

<a name="BaseEvernodeClient+off"></a>

### tenantClient.off(event, handler)
Detach the listener event.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>off</code>](#BaseEvernodeClient+off)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | Event name. |
| handler | <code>function</code> | <code></code> | (optional) Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified. |

<a name="BaseEvernodeClient+connect"></a>

### tenantClient.connect() ⇒
Connects the client to xrpl server and do the config loading and subscriptions. 'subscribe' is called inside this.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>connect</code>](#BaseEvernodeClient+connect)  
**Returns**: Boolean value `true` if the connection is successful.  
<a name="BaseEvernodeClient+disconnect"></a>

### tenantClient.disconnect()
Disconnects the client to xrpl server and do the un-subscriptions. 'unsubscribe' is called inside this.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>disconnect</code>](#BaseEvernodeClient+disconnect)  
<a name="BaseEvernodeClient+subscribe"></a>

### tenantClient.subscribe()
Subscribes to the client events.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>subscribe</code>](#BaseEvernodeClient+subscribe)  
<a name="BaseEvernodeClient+unsubscribe"></a>

### tenantClient.unsubscribe()
Unsubscribes from the client events.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>unsubscribe</code>](#BaseEvernodeClient+unsubscribe)  
<a name="BaseEvernodeClient+getEVRBalance"></a>

### tenantClient.getEVRBalance() ⇒
Get the EVR balance in the account.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getEVRBalance</code>](#BaseEvernodeClient+getEVRBalance)  
**Returns**: The available EVR amount as a string.  
<a name="BaseEvernodeClient+getHookStates"></a>

### tenantClient.getHookStates() ⇒
Get all XRPL hook states in the registry account.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getHookStates</code>](#BaseEvernodeClient+getHookStates)  
**Returns**: The list of hook states, including Evernode configuration and hosts.  
<a name="BaseEvernodeClient+getMoment"></a>

### tenantClient.getMoment(index) ⇒
Get the moment from the given index (timestamp).

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getMoment</code>](#BaseEvernodeClient+getMoment)  
**Returns**: The moment of the given index (timestamp) as a number. Returns the current moment if the timestamp is not provided.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment value. |

<a name="BaseEvernodeClient+getMomentStartIndex"></a>

### tenantClient.getMomentStartIndex(index) ⇒
Get start index (timestamp) of the moment.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getMomentStartIndex</code>](#BaseEvernodeClient+getMomentStartIndex)  
**Returns**: The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>number</code> | <code></code> | [Optional] Index (timestamp) to get the moment start index. |

<a name="BaseEvernodeClient+refreshConfig"></a>

### tenantClient.refreshConfig()
Loads the configs from XRPL hook and updates the in-memory config.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>refreshConfig</code>](#BaseEvernodeClient+refreshConfig)  
<a name="BaseEvernodeClient+extractEvernodeEvent"></a>

### tenantClient.extractEvernodeEvent(tx) ⇒
Extracts the transaction info from a given transaction.
Note: You need to deserialize HookParameters before passing the transaction to this function.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>extractEvernodeEvent</code>](#BaseEvernodeClient+extractEvernodeEvent)  
**Returns**: The event object in format `{name: string, data: Object}`. Returns `null` if the event is not handled.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | The transaction object to be deserialized and extracted. |

<a name="BaseEvernodeClient+getHostInfo"></a>

### tenantClient.getHostInfo(hostAddress) ⇒
Get the registered host information.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getHostInfo</code>](#BaseEvernodeClient+getHostInfo)  
**Returns**: The registered host information object. Returns null if not registered.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the host. |

<a name="BaseEvernodeClient+getAllHostsFromLedger"></a>

### tenantClient.getAllHostsFromLedger() ⇒
Get the hosts registered in Evernode.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getAllHostsFromLedger</code>](#BaseEvernodeClient+getAllHostsFromLedger)  
**Returns**: The list of hosts.  
<a name="BaseEvernodeClient+getAllCandidatesFromLedger"></a>

### tenantClient.getAllCandidatesFromLedger() ⇒
Get the governor in Evernode.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getAllCandidatesFromLedger</code>](#BaseEvernodeClient+getAllCandidatesFromLedger)  
**Returns**: The list of candidates.  
<a name="BaseEvernodeClient+pruneDeadHost"></a>

### tenantClient.pruneDeadHost(hostAddress)
Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>pruneDeadHost</code>](#BaseEvernodeClient+pruneDeadHost)  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | XRPL address of the host to be pruned. |

<a name="BaseEvernodeClient+getCandidateByOwner"></a>

### tenantClient.getCandidateByOwner(ownerAddress) ⇒
Get proposed new hook candidate info.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getCandidateByOwner</code>](#BaseEvernodeClient+getCandidateByOwner)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | [Optional] Address of the owner. |

<a name="BaseEvernodeClient+getDudHostCandidatesByOwner"></a>

### tenantClient.getDudHostCandidatesByOwner(ownerAddress) ⇒
Get proposed dud host candidates.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getDudHostCandidatesByOwner</code>](#BaseEvernodeClient+getDudHostCandidatesByOwner)  
**Returns**: An array of candidate information. Returns empty array if no candidates.  

| Param | Type | Description |
| --- | --- | --- |
| ownerAddress | <code>string</code> | | Address of the owner |

<a name="BaseEvernodeClient+getCandidateById"></a>

### tenantClient.getCandidateById(candidateId) ⇒
Get candidate info.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getCandidateById</code>](#BaseEvernodeClient+getCandidateById)  
**Returns**: The candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | Id of the candidate. |

<a name="BaseEvernodeClient+getDudHostVoteInfo"></a>

### tenantClient.getDudHostVoteInfo(hostAddress) ⇒
Get reported dud host info.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getDudHostVoteInfo</code>](#BaseEvernodeClient+getDudHostVoteInfo)  
**Returns**: The dud host candidate information. Returns null if no candidate.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | [Optional] Address of the dud host. |

<a name="BaseEvernodeClient+getPilotedModeVoteInfo"></a>

### tenantClient.getPilotedModeVoteInfo() ⇒
Get piloted mode vote info.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getPilotedModeVoteInfo</code>](#BaseEvernodeClient+getPilotedModeVoteInfo)  
**Returns**: The piloted mode candidate information. Returns null if no candidate.  
<a name="BaseEvernodeClient+getReputationAddressByOrderedId"></a>

### tenantClient.getReputationAddressByOrderedId(orderedId, moment) ⇒
Get reputation order info of given orderedId.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getReputationAddressByOrderedId</code>](#BaseEvernodeClient+getReputationAddressByOrderedId)  
**Returns**: Reputation address info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| orderedId | <code>number</code> |  | Order id of the host. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationOrderByAddress"></a>

### tenantClient.getReputationOrderByAddress(hostAddress, moment) ⇒
Get reputation order info of given host.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getReputationOrderByAddress</code>](#BaseEvernodeClient+getReputationOrderByAddress)  
**Returns**: Reputation order info object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hostAddress | <code>string</code> |  | (optional) Host address. |
| moment | <code>number</code> | <code></code> | (optional) Moment to get reputation info for. |

<a name="BaseEvernodeClient+getReputationContractInfoByAddress"></a>

### tenantClient.getReputationContractInfoByAddress(hostsAddress, moment) ⇒
Get reputation contract info of given host.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getReputationContractInfoByAddress</code>](#BaseEvernodeClient+getReputationContractInfoByAddress)  
**Returns**: Reputation contract info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |
| moment | <code>number</code> | (optional) Moment to get reputation contract info for. |

<a name="BaseEvernodeClient+getReputationInfoByAddress"></a>

### tenantClient.getReputationInfoByAddress(hostsAddress) ⇒
Get reputation info of given host.

**Kind**: instance method of [<code>TenantClient</code>](#TenantClient)  
**Overrides**: [<code>getReputationInfoByAddress</code>](#BaseEvernodeClient+getReputationInfoByAddress)  
**Returns**: Reputation info object.  

| Param | Type | Description |
| --- | --- | --- |
| hostsAddress | <code>string</code> | Host address. |

<a name="Defaults"></a>

## Defaults
Defaults class is responsible for retrieving and overriding the default Evernode network configurations.

**Kind**: global class  

* [Defaults](#Defaults)
    * [.values](#Defaults.values) ⇒
    * [.useNetwork(network)](#Defaults.useNetwork)
    * [.set(newDefaults)](#Defaults.set)

<a name="Defaults.values"></a>

### Defaults.values ⇒
Read Evernode default configs.

**Kind**: static property of [<code>Defaults</code>](#Defaults)  
**Returns**: The Object of Evernode configs  
<a name="Defaults.useNetwork"></a>

### Defaults.useNetwork(network)
Load defaults from the public definitions json.

**Kind**: static method of [<code>Defaults</code>](#Defaults)  

| Param | Type | Description |
| --- | --- | --- |
| network | <code>string</code> | Network to choose the info. |

<a name="Defaults.set"></a>

### Defaults.set(newDefaults)
Override Evernode default configs.

**Kind**: static method of [<code>Defaults</code>](#Defaults)  

| Param | Type | Description |
| --- | --- | --- |
| newDefaults | <code>object</code> | Configurations to override `{ governorAddress: '{string} governor xrpl address', rippledServer: '{string} rippled server url', xrplApi: '{XrplApi} xrpl instance', stateIndexId: '{string} firestore index', networkID: '{number} rippled network id' }` |

<a name="EncryptionHelper"></a>

## EncryptionHelper
EncryptionHelper class is responsible for encrypt and decrypt functions for messages.

**Kind**: global class  

* [EncryptionHelper](#EncryptionHelper)
    * [.encrypt(publicKey, message, [options])](#EncryptionHelper.encrypt) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
    * [.decrypt(privateKey, encrypted)](#EncryptionHelper.decrypt) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>

<a name="EncryptionHelper.encrypt"></a>

### EncryptionHelper.encrypt(publicKey, message, [options]) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Encrypts a message using the given public key.

**Kind**: static method of [<code>EncryptionHelper</code>](#EncryptionHelper)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - A promise that resolves to the encrypted message in base64 format, or null if encryption fails.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| publicKey | <code>string</code> |  | The public key to use for encryption. |
| message | <code>Object</code> |  | The message object to be encrypted. |
| [options] | <code>Object</code> | <code>{}</code> | Optional encryption parameters. |

<a name="EncryptionHelper.decrypt"></a>

### EncryptionHelper.decrypt(privateKey, encrypted) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Decrypts an encrypted message using the given private key.

**Kind**: static method of [<code>EncryptionHelper</code>](#EncryptionHelper)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - A promise that resolves to the decrypted message as an object, or null if decryption fails.  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | The private key to use for decryption. |
| encrypted | <code>string</code> | The encrypted message string. |

<a name="EvernodeHelpers"></a>

## EvernodeHelpers
Provides various utility functions for working with leases, tokens, and ledger entries within the Xahau ecosystem.

**Kind**: global class  

* [EvernodeHelpers](#EvernodeHelpers)
    * [.getLeases(xrplAcc)](#EvernodeHelpers.getLeases) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getLeaseByIndex(xrplApi, index)](#EvernodeHelpers.getLeaseByIndex) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
    * [.getLeaseOffers(xrplAcc)](#EvernodeHelpers.getLeaseOffers) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getUnofferedLeases(xrplAcc)](#EvernodeHelpers.getUnofferedLeases) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNFTPageAndLocation(nfTokenId, xrplAcc, xrplApi, [buffer])](#EvernodeHelpers.getNFTPageAndLocation) ⇒ <code>Promise.&lt;(Buffer\|Object)&gt;</code>
    * [.getEpochRewardQuota(epoch, firstEpochRewardQuota)](#EvernodeHelpers.getEpochRewardQuota) ⇒ <code>number</code>
    * [.isValidURI(uri, pattern, [tokenCategory])](#EvernodeHelpers.isValidURI) ⇒ <code>boolean</code>

<a name="EvernodeHelpers.getLeases"></a>

### EvernodeHelpers.getLeases(xrplAcc) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves URI tokens that are valid leases for the specified XRPL account.

**Kind**: static method of [<code>EvernodeHelpers</code>](#EvernodeHelpers)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - A promise that resolves to an array of URI tokens that are valid leases.  

| Param | Type | Description |
| --- | --- | --- |
| xrplAcc | <code>Object</code> | The XRPL account object. |

<a name="EvernodeHelpers.getLeaseByIndex"></a>

### EvernodeHelpers.getLeaseByIndex(xrplApi, index) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Retrieves a lease by its index from the XRPL ledger.

**Kind**: static method of [<code>EvernodeHelpers</code>](#EvernodeHelpers)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - A promise that resolves to the lease entry or null if not found or invalid.  

| Param | Type | Description |
| --- | --- | --- |
| xrplApi | [<code>XrplApi</code>](#XrplApi) | The XRPL API object. |
| index | <code>string</code> | The ledger entry index. |

<a name="EvernodeHelpers.getLeaseOffers"></a>

### EvernodeHelpers.getLeaseOffers(xrplAcc) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves all leases that have offers (i.e., an associated amount) for the specified XRPL account.

**Kind**: static method of [<code>EvernodeHelpers</code>](#EvernodeHelpers)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - A promise that resolves to an array of URI tokens with offers.  

| Param | Type | Description |
| --- | --- | --- |
| xrplAcc | <code>Object</code> | The XRPL account object. |

<a name="EvernodeHelpers.getUnofferedLeases"></a>

### EvernodeHelpers.getUnofferedLeases(xrplAcc) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves leases that do not have offers (i.e., no amount associated) for the specified XRPL account.

**Kind**: static method of [<code>EvernodeHelpers</code>](#EvernodeHelpers)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - A promise that resolves to an array of unoffered URI tokens.  

| Param | Type | Description |
| --- | --- | --- |
| xrplAcc | <code>Object</code> | The XRPL account object. |

<a name="EvernodeHelpers.getNFTPageAndLocation"></a>

### EvernodeHelpers.getNFTPageAndLocation(nfTokenId, xrplAcc, xrplApi, [buffer]) ⇒ <code>Promise.&lt;(Buffer\|Object)&gt;</code>
Finds the NFT page and location of a specific NFToken in the XRPL ledger.

**Kind**: static method of [<code>EvernodeHelpers</code>](#EvernodeHelpers)  
**Returns**: <code>Promise.&lt;(Buffer\|Object)&gt;</code> - A promise that resolves to either a buffer with the NFT page and location or an object with page and location details.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| nfTokenId | <code>string</code> |  | The ID of the NFToken. |
| xrplAcc | <code>Object</code> |  | The XRPL account object. |
| xrplApi | <code>Object</code> |  | The XRPL API object. |
| [buffer] | <code>boolean</code> | <code>true</code> | Whether to return the result as a buffer. |

<a name="EvernodeHelpers.getEpochRewardQuota"></a>

### EvernodeHelpers.getEpochRewardQuota(epoch, firstEpochRewardQuota) ⇒ <code>number</code>
Calculates the reward quota for a specific epoch.

**Kind**: static method of [<code>EvernodeHelpers</code>](#EvernodeHelpers)  
**Returns**: <code>number</code> - The calculated reward quota for the specified epoch.  

| Param | Type | Description |
| --- | --- | --- |
| epoch | <code>number</code> | The epoch number. |
| firstEpochRewardQuota | <code>number</code> | The reward quota for the first epoch. |

<a name="EvernodeHelpers.isValidURI"></a>

### EvernodeHelpers.isValidURI(uri, pattern, [tokenCategory]) ⇒ <code>boolean</code>
Checks if a given URI is valid based on a pattern and token category.

**Kind**: static method of [<code>EvernodeHelpers</code>](#EvernodeHelpers)  
**Returns**: <code>boolean</code> - Returns true if the URI is valid, false otherwise.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uri | <code>string</code> |  | The URI to validate. |
| pattern | <code>string</code> |  | The pattern to match the URI against. |
| [tokenCategory] | <code>string</code> | <code>&quot;URITokenTypes.LEASE_URI_TOKEN&quot;</code> | The token category (default is a lease URI token). |

<a name="StateHelpers"></a>

## StateHelpers
Provides various utility functions for working with States.

**Kind**: global class  

* [StateHelpers](#StateHelpers)
    * [.getStateData(states, key)](#StateHelpers.getStateData) ⇒ <code>Object</code> \| <code>null</code>
    * [.decodeReputationHostAddressState(stateKeyBuf, stateDataBuf)](#StateHelpers.decodeReputationHostAddressState) ⇒ <code>Object</code>
    * [.decodeReputationHostOrderAddressState(stateKeyBuf, stateDataBuf)](#StateHelpers.decodeReputationHostOrderAddressState) ⇒ <code>Object</code>
    * [.decodeReputationHostOrderedIdState(stateKeyBuf, stateDataBuf)](#StateHelpers.decodeReputationHostOrderedIdState) ⇒ <code>Object</code>
    * [.decodeReputationHostCountState(stateKeyBuf, stateDataBuf)](#StateHelpers.decodeReputationHostCountState) ⇒ <code>Object</code>
    * [.decodeHostAddressState(stateKeyBuf, stateDataBuf)](#StateHelpers.decodeHostAddressState) ⇒ <code>Object</code>
    * [.decodeTokenIdState(stateDataBuf)](#StateHelpers.decodeTokenIdState) ⇒ <code>Object</code>
    * [.decodeTransfereeAddrState(stateKeyBuf, stateDataBuf)](#StateHelpers.decodeTransfereeAddrState) ⇒ <code>Object</code>
    * [.decodeCandidateOwnerState(stateKeyBuf, stateDataBuf)](#StateHelpers.decodeCandidateOwnerState) ⇒ <code>Object</code>
    * [.decodeCandidateIdState(stateDataBuf)](#StateHelpers.decodeCandidateIdState) ⇒ <code>Object</code>
    * [.decodeStateData(stateKey, stateData)](#StateHelpers.decodeStateData) ⇒ <code>Object</code>
    * [.decodeStateKey(stateKey)](#StateHelpers.decodeStateKey) ⇒ <code>Object</code>
    * [.generateTokenIdStateKey(uriToken)](#StateHelpers.generateTokenIdStateKey) ⇒ <code>string</code>
    * [.generateHostAddrStateKey(address)](#StateHelpers.generateHostAddrStateKey) ⇒ <code>string</code>
    * [.generateReputationHostAddrStateKey(address)](#StateHelpers.generateReputationHostAddrStateKey) ⇒ <code>string</code>
    * [.generateReputationHostOrderAddressStateKey(address, moment)](#StateHelpers.generateReputationHostOrderAddressStateKey) ⇒ <code>string</code>
    * [.generateReputationHostOrderedIdStateKey(orderedId, moment)](#StateHelpers.generateReputationHostOrderedIdStateKey) ⇒ <code>string</code>
    * [.generateReputationHostCountStateKey(moment)](#StateHelpers.generateReputationHostCountStateKey) ⇒ <code>string</code>
    * [.generateReputationContractInfoStateKey(address)](#StateHelpers.generateReputationContractInfoStateKey) ⇒ <code>string</code>
    * [.generateTransfereeAddrStateKey(address)](#StateHelpers.generateTransfereeAddrStateKey) ⇒ <code>string</code>
    * [.generateCandidateIdStateKey(uniqueId)](#StateHelpers.generateCandidateIdStateKey) ⇒ <code>string</code>
    * [.generateCandidateOwnerStateKey(owner)](#StateHelpers.generateCandidateOwnerStateKey) ⇒ <code>string</code>
    * [.getHookStateIndex(hookAccount, stateKey, [hookNamespace])](#StateHelpers.getHookStateIndex) ⇒ <code>string</code>
    * [.getNewHookCandidateId(hashesBuf)](#StateHelpers.getNewHookCandidateId) ⇒ <code>string</code>
    * [.getPilotedModeCandidateId()](#StateHelpers.getPilotedModeCandidateId) ⇒ <code>string</code>
    * [.getDudHostCandidateId(hostAddress)](#StateHelpers.getDudHostCandidateId) ⇒ <code>string</code>
    * [.getCandidateType(candidateId)](#StateHelpers.getCandidateType) ⇒ <code>number</code>

<a name="StateHelpers.getStateData"></a>

### StateHelpers.getStateData(states, key) ⇒ <code>Object</code> \| <code>null</code>
Retrieves the state data for a specific key from an array of states.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> \| <code>null</code> - The state data or null if not found.  

| Param | Type | Description |
| --- | --- | --- |
| states | <code>Array</code> | Array of state objects. |
| key | <code>string</code> | Key for the state data. |

<a name="StateHelpers.decodeReputationHostAddressState"></a>

### StateHelpers.decodeReputationHostAddressState(stateKeyBuf, stateDataBuf) ⇒ <code>Object</code>
Decodes reputation host address state from buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - Decoded state data including host address and reputation metrics.  

| Param | Type | Description |
| --- | --- | --- |
| stateKeyBuf | <code>Buffer</code> | Buffer containing the state key. |
| stateDataBuf | <code>Buffer</code> | Buffer containing the state data. |

<a name="StateHelpers.decodeReputationHostOrderAddressState"></a>

### StateHelpers.decodeReputationHostOrderAddressState(stateKeyBuf, stateDataBuf) ⇒ <code>Object</code>
Decodes reputation host order address state from buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - Decoded state data including moment and ordered ID.  

| Param | Type | Description |
| --- | --- | --- |
| stateKeyBuf | <code>Buffer</code> | Buffer containing the state key. |
| stateDataBuf | <code>Buffer</code> | Buffer containing the state data. |

<a name="StateHelpers.decodeReputationHostOrderedIdState"></a>

### StateHelpers.decodeReputationHostOrderedIdState(stateKeyBuf, stateDataBuf) ⇒ <code>Object</code>
Decodes reputation host ordered ID state from buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - Decoded state data including moment and ordered ID.  

| Param | Type | Description |
| --- | --- | --- |
| stateKeyBuf | <code>Buffer</code> | Buffer containing the state key. |
| stateDataBuf | <code>Buffer</code> | Buffer containing the state data. |

<a name="StateHelpers.decodeReputationHostCountState"></a>

### StateHelpers.decodeReputationHostCountState(stateKeyBuf, stateDataBuf) ⇒ <code>Object</code>
Decodes reputation host count state from buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - Decoded state data including moment and count.  

| Param | Type | Description |
| --- | --- | --- |
| stateKeyBuf | <code>Buffer</code> | Buffer containing the state key. |
| stateDataBuf | <code>Buffer</code> | Buffer containing the state data. |

<a name="StateHelpers.decodeHostAddressState"></a>

### StateHelpers.decodeHostAddressState(stateKeyBuf, stateDataBuf) ⇒ <code>Object</code>
Decodes a host address state from buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - The decoded host address state.  

| Param | Type | Description |
| --- | --- | --- |
| stateKeyBuf | <code>Buffer</code> | The buffer containing the state key. |
| stateDataBuf | <code>Buffer</code> | The buffer containing the state data. |

<a name="StateHelpers.decodeTokenIdState"></a>

### StateHelpers.decodeTokenIdState(stateDataBuf) ⇒ <code>Object</code>
Decodes a token ID state from a buffer.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - The decoded token ID state.  

| Param | Type | Description |
| --- | --- | --- |
| stateDataBuf | <code>Buffer</code> | The buffer containing the state data. |

<a name="StateHelpers.decodeTransfereeAddrState"></a>

### StateHelpers.decodeTransfereeAddrState(stateKeyBuf, stateDataBuf) ⇒ <code>Object</code>
Decodes a transferee address state from buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - The decoded transferee address state.  

| Param | Type | Description |
| --- | --- | --- |
| stateKeyBuf | <code>Buffer</code> | The buffer containing the state key. |
| stateDataBuf | <code>Buffer</code> | The buffer containing the state data. |

<a name="StateHelpers.decodeCandidateOwnerState"></a>

### StateHelpers.decodeCandidateOwnerState(stateKeyBuf, stateDataBuf) ⇒ <code>Object</code>
Decodes a candidate owner state from buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - The decoded candidate owner state.  

| Param | Type | Description |
| --- | --- | --- |
| stateKeyBuf | <code>Buffer</code> | The buffer containing the state key. |
| stateDataBuf | <code>Buffer</code> | The buffer containing the state data. |

<a name="StateHelpers.decodeCandidateIdState"></a>

### StateHelpers.decodeCandidateIdState(stateDataBuf) ⇒ <code>Object</code>
Decodes a candidate ID state from a buffer.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - The decoded candidate ID state.  

| Param | Type | Description |
| --- | --- | --- |
| stateDataBuf | <code>Buffer</code> | The buffer containing the state data. |

<a name="StateHelpers.decodeStateData"></a>

### StateHelpers.decodeStateData(stateKey, stateData) ⇒ <code>Object</code>
Decodes state data based on the state key and state data buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - The decoded state data with type information.  

| Param | Type | Description |
| --- | --- | --- |
| stateKey | <code>Buffer</code> | The buffer containing the state key. |
| stateData | <code>Buffer</code> | The buffer containing the state data. |

<a name="StateHelpers.decodeStateKey"></a>

### StateHelpers.decodeStateKey(stateKey) ⇒ <code>Object</code>
Decodes a state key into a type and key.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>Object</code> - An object containing the key as a hexadecimal string and its type.  
**Throws**:

- <code>Object</code> Throws a Validation Error if the state key is invalid.


| Param | Type | Description |
| --- | --- | --- |
| stateKey | <code>Buffer</code> | The buffer containing the state key. |

<a name="StateHelpers.generateTokenIdStateKey"></a>

### StateHelpers.generateTokenIdStateKey(uriToken) ⇒ <code>string</code>
Generates a state key for a token ID.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| uriToken | <code>string</code> | The URI token in hexadecimal format. |

<a name="StateHelpers.generateHostAddrStateKey"></a>

### StateHelpers.generateHostAddrStateKey(address) ⇒ <code>string</code>
Generates a state key for a host address.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The host address. |

<a name="StateHelpers.generateReputationHostAddrStateKey"></a>

### StateHelpers.generateReputationHostAddrStateKey(address) ⇒ <code>string</code>
Generates a state key for a reputation host address.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The reputation host address. |

<a name="StateHelpers.generateReputationHostOrderAddressStateKey"></a>

### StateHelpers.generateReputationHostOrderAddressStateKey(address, moment) ⇒ <code>string</code>
Generates a state key for a reputation host order address.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The reputation host address. |
| moment | <code>number</code> | The moment timestamp. |

<a name="StateHelpers.generateReputationHostOrderedIdStateKey"></a>

### StateHelpers.generateReputationHostOrderedIdStateKey(orderedId, moment) ⇒ <code>string</code>
Generates a state key for a reputation host ordered ID.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| orderedId | <code>string</code> | The ordered ID. |
| moment | <code>number</code> | The moment timestamp. |

<a name="StateHelpers.generateReputationHostCountStateKey"></a>

### StateHelpers.generateReputationHostCountStateKey(moment) ⇒ <code>string</code>
Generates a state key for a reputation host count.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| moment | <code>number</code> | The moment timestamp. |

<a name="StateHelpers.generateReputationContractInfoStateKey"></a>

### StateHelpers.generateReputationContractInfoStateKey(address) ⇒ <code>string</code>
Generates a state key for reputation contract information.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The contract address. |

<a name="StateHelpers.generateTransfereeAddrStateKey"></a>

### StateHelpers.generateTransfereeAddrStateKey(address) ⇒ <code>string</code>
Generates a state key for a transferee address.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The transferee address. |

<a name="StateHelpers.generateCandidateIdStateKey"></a>

### StateHelpers.generateCandidateIdStateKey(uniqueId) ⇒ <code>string</code>
Generates a state key for a candidate ID.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| uniqueId | <code>string</code> | The unique candidate ID. |

<a name="StateHelpers.generateCandidateOwnerStateKey"></a>

### StateHelpers.generateCandidateOwnerStateKey(owner) ⇒ <code>string</code>
Generates a state key for a candidate owner.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated state key as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| owner | <code>string</code> | The candidate owner address. |

<a name="StateHelpers.getHookStateIndex"></a>

### StateHelpers.getHookStateIndex(hookAccount, stateKey, [hookNamespace]) ⇒ <code>string</code>
Gets the hook state index for a specific hook account and state key.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The hook state index as a hexadecimal string.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hookAccount | <code>string</code> |  | The hook account address. |
| stateKey | <code>string</code> |  | The state key as a hexadecimal string. |
| [hookNamespace] | <code>string</code> | <code>&quot;EvernodeConstants.HOOK_NAMESPACE&quot;</code> | The hook namespace. |

<a name="StateHelpers.getNewHookCandidateId"></a>

### StateHelpers.getNewHookCandidateId(hashesBuf) ⇒ <code>string</code>
Generates a new hook candidate ID based on hash buffers.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated candidate ID as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| hashesBuf | <code>Buffer</code> | The buffer containing the hash data. |

<a name="StateHelpers.getPilotedModeCandidateId"></a>

### StateHelpers.getPilotedModeCandidateId() ⇒ <code>string</code>
Generates a candidate ID for the piloted mode.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated candidate ID as a hexadecimal string.  
<a name="StateHelpers.getDudHostCandidateId"></a>

### StateHelpers.getDudHostCandidateId(hostAddress) ⇒ <code>string</code>
Generates a candidate ID for a dud host.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>string</code> - The generated candidate ID as a hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| hostAddress | <code>string</code> | The host address. |

<a name="StateHelpers.getCandidateType"></a>

### StateHelpers.getCandidateType(candidateId) ⇒ <code>number</code>
Retrieves the candidate type from a candidate ID.

**Kind**: static method of [<code>StateHelpers</code>](#StateHelpers)  
**Returns**: <code>number</code> - The candidate type.  

| Param | Type | Description |
| --- | --- | --- |
| candidateId | <code>string</code> | The candidate ID as a hexadecimal string. |

<a name="TransactionHelper"></a>

## TransactionHelper
Provides various utility functions for working with Xahau Transactions.

**Kind**: global class  

* [TransactionHelper](#TransactionHelper)
    * [.formatMemos(memos)](#TransactionHelper.formatMemos) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.deserializeMemos(memos)](#TransactionHelper.deserializeMemos) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.formatHookParams(params)](#TransactionHelper.formatHookParams) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.deserializeHookParams(params)](#TransactionHelper.deserializeHookParams) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.hexToASCII(hex)](#TransactionHelper.hexToASCII) ⇒ <code>string</code>
    * [.asciiToHex(str)](#TransactionHelper.asciiToHex) ⇒ <code>string</code>

<a name="TransactionHelper.formatMemos"></a>

### TransactionHelper.formatMemos(memos) ⇒ <code>Array.&lt;Object&gt;</code>
Converts an array of memos from the internal format to the XRPL library format.

**Kind**: static method of [<code>TransactionHelper</code>](#TransactionHelper)  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of memo objects in the XRPL library format.  

| Param | Type | Description |
| --- | --- | --- |
| memos | <code>Array.&lt;Object&gt;</code> | An array of memo objects in the internal format. |

<a name="TransactionHelper.deserializeMemos"></a>

### TransactionHelper.deserializeMemos(memos) ⇒ <code>Array.&lt;Object&gt;</code>
Converts an array of memos from the XRPL library format to the internal format.

**Kind**: static method of [<code>TransactionHelper</code>](#TransactionHelper)  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of memo objects in the internal format.  

| Param | Type | Description |
| --- | --- | --- |
| memos | <code>Array.&lt;Object&gt;</code> | An array of memo objects in the XRPL library format. |

<a name="TransactionHelper.formatHookParams"></a>

### TransactionHelper.formatHookParams(params) ⇒ <code>Array.&lt;Object&gt;</code>
Converts an array of hook parameters from the internal format to the XRPL library format.

**Kind**: static method of [<code>TransactionHelper</code>](#TransactionHelper)  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of hook parameter objects in the XRPL library format.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Array.&lt;Object&gt;</code> | An array of hook parameter objects in the internal format. |

<a name="TransactionHelper.deserializeHookParams"></a>

### TransactionHelper.deserializeHookParams(params) ⇒ <code>Array.&lt;Object&gt;</code>
Converts an array of hook parameters from the XRPL library format to the internal format.

**Kind**: static method of [<code>TransactionHelper</code>](#TransactionHelper)  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of hook parameter objects in the internal format.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Array.&lt;Object&gt;</code> | An array of hook parameter objects in the XRPL library format. |

<a name="TransactionHelper.hexToASCII"></a>

### TransactionHelper.hexToASCII(hex) ⇒ <code>string</code>
Converts a hexadecimal string to an ASCII string.

**Kind**: static method of [<code>TransactionHelper</code>](#TransactionHelper)  
**Returns**: <code>string</code> - The resulting ASCII string.  

| Param | Type | Description |
| --- | --- | --- |
| hex | <code>string</code> | The hexadecimal string to be converted. |

<a name="TransactionHelper.asciiToHex"></a>

### TransactionHelper.asciiToHex(str) ⇒ <code>string</code>
Converts an ASCII string to a hexadecimal string.

**Kind**: static method of [<code>TransactionHelper</code>](#TransactionHelper)  
**Returns**: <code>string</code> - The resulting hexadecimal string.  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | The ASCII string to be converted. |

<a name="UtilHelpers"></a>

## UtilHelpers
Provides utility helper functions for various operations.

**Kind**: global class  

* [UtilHelpers](#UtilHelpers)
    * [.decodeLeaseTokenUri(hexUri)](#UtilHelpers.decodeLeaseTokenUri) ⇒ <code>Object</code>
    * [.getCurrentUnixTime([format])](#UtilHelpers.getCurrentUnixTime) ⇒ <code>number</code>
    * [.deriveKeypair(secret)](#UtilHelpers.deriveKeypair) ⇒ <code>Object</code>
    * [.deriveAddress(publicKey)](#UtilHelpers.deriveAddress) ⇒ <code>string</code>

<a name="UtilHelpers.decodeLeaseTokenUri"></a>

### UtilHelpers.decodeLeaseTokenUri(hexUri) ⇒ <code>Object</code>
Decodes a lease token URI into its integrant parts.

**Kind**: static method of [<code>UtilHelpers</code>](#UtilHelpers)  
**Returns**: <code>Object</code> - An object containing the decoded lease token URI's version, leaseIndex, halfTos, leaseAmount, identifier, and outboundIP  

| Param | Type | Description |
| --- | --- | --- |
| hexUri | <code>string</code> | The lease token URI in hexadecimal format. |

<a name="UtilHelpers.getCurrentUnixTime"></a>

### UtilHelpers.getCurrentUnixTime([format]) ⇒ <code>number</code>
Gets the current Unix time.

**Kind**: static method of [<code>UtilHelpers</code>](#UtilHelpers)  
**Returns**: <code>number</code> - The current Unix time in the specified format.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [format] | <code>string</code> | <code>&quot;\&quot;sec\&quot;&quot;</code> | The format of the time. If "sec", returns the time in seconds; otherwise, returns the time in milliseconds. |

<a name="UtilHelpers.deriveKeypair"></a>

### UtilHelpers.deriveKeypair(secret) ⇒ <code>Object</code>
Derives a keypair from a given secret.

**Kind**: static method of [<code>UtilHelpers</code>](#UtilHelpers)  
**Returns**: <code>Object</code> - An object containing the derived keypair.  

| Param | Type | Description |
| --- | --- | --- |
| secret | <code>string</code> | The secret used to derive the keypair. |

<a name="UtilHelpers.deriveAddress"></a>

### UtilHelpers.deriveAddress(publicKey) ⇒ <code>string</code>
Derives an address from a given public key.

**Kind**: static method of [<code>UtilHelpers</code>](#UtilHelpers)  
**Returns**: <code>string</code> - The derived address.  

| Param | Type | Description |
| --- | --- | --- |
| publicKey | <code>string</code> | The public key used to derive the address. |

<a name="XflHelpers"></a>

## XflHelpers
Helper class for handling XFL (Extended Floating-Point) float numbers.

**Kind**: global class  

* [XflHelpers](#XflHelpers)
    * [.getExponent(xfl)](#XflHelpers.getExponent) ⇒ <code>bigint</code>
    * [.getMantissa(xfl)](#XflHelpers.getMantissa) ⇒ <code>bigint</code>
    * [.isNegative(xfl)](#XflHelpers.isNegative) ⇒ <code>boolean</code>
    * [.toString(xfl)](#XflHelpers.toString) ⇒ <code>string</code>
    * [.getXfl(floatStr)](#XflHelpers.getXfl) ⇒ <code>bigint</code>

<a name="XflHelpers.getExponent"></a>

### XflHelpers.getExponent(xfl) ⇒ <code>bigint</code>
Retrieves the exponent of the XFL float number.

**Kind**: static method of [<code>XflHelpers</code>](#XflHelpers)  
**Returns**: <code>bigint</code> - The exponent of the XFL float number.  
**Throws**:

- <code>string</code> Throws an error if the XFL float number is negative.


| Param | Type | Description |
| --- | --- | --- |
| xfl | <code>bigint</code> | The XFL float number. |

<a name="XflHelpers.getMantissa"></a>

### XflHelpers.getMantissa(xfl) ⇒ <code>bigint</code>
Retrieves the mantissa of the XFL float number.

**Kind**: static method of [<code>XflHelpers</code>](#XflHelpers)  
**Returns**: <code>bigint</code> - The mantissa of the XFL float number.  
**Throws**:

- <code>string</code> Throws an error if the XFL float number is negative.


| Param | Type | Description |
| --- | --- | --- |
| xfl | <code>bigint</code> | The XFL float number. |

<a name="XflHelpers.isNegative"></a>

### XflHelpers.isNegative(xfl) ⇒ <code>boolean</code>
Checks if the XFL float number is negative.

**Kind**: static method of [<code>XflHelpers</code>](#XflHelpers)  
**Returns**: <code>boolean</code> - `true` if the XFL float number is negative, otherwise `false`.  
**Throws**:

- <code>string</code> Throws an error if the XFL float number is negative.


| Param | Type | Description |
| --- | --- | --- |
| xfl | <code>bigint</code> | The XFL float number. |

<a name="XflHelpers.toString"></a>

### XflHelpers.toString(xfl) ⇒ <code>string</code>
Converts an XFL float number to its string representation.

**Kind**: static method of [<code>XflHelpers</code>](#XflHelpers)  
**Returns**: <code>string</code> - The string representation of the XFL float number.  
**Throws**:

- <code>string</code> Throws an error if the XFL float number is negative.


| Param | Type | Description |
| --- | --- | --- |
| xfl | <code>bigint</code> | The XFL float number. |

<a name="XflHelpers.getXfl"></a>

### XflHelpers.getXfl(floatStr) ⇒ <code>bigint</code>
Converts a string representation of a float number to an XFL float number.

**Kind**: static method of [<code>XflHelpers</code>](#XflHelpers)  
**Returns**: <code>bigint</code> - The XFL float number.  

| Param | Type | Description |
| --- | --- | --- |
| floatStr | <code>string</code> | The string representation of the float number. |

<a name="XrplAccount"></a>

## XrplAccount
Represents an XRP Ledger account and provides methods for account management.

**Kind**: global class  

* [XrplAccount](#XrplAccount)
    * [new XrplAccount(address, secret, options)](#new_XrplAccount_new)
    * [.on(event, handler)](#XrplAccount+on)
    * [.once(event, handler)](#XrplAccount+once)
    * [.off(event, handler)](#XrplAccount+off)
    * [.deriveKeypair()](#XrplAccount+deriveKeypair) ⇒ <code>Object</code>
    * [.exists()](#XrplAccount+exists) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.getInfo()](#XrplAccount+getInfo) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getSequence()](#XrplAccount+getSequence) ⇒ <code>Promise.&lt;number&gt;</code>
    * [.getMintedNFTokens()](#XrplAccount+getMintedNFTokens) ⇒ <code>Promise.&lt;number&gt;</code>
    * [.getBurnedNFTokens()](#XrplAccount+getBurnedNFTokens) ⇒ <code>number</code>
    * [.getMessageKey()](#XrplAccount+getMessageKey) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
    * [.getWalletLocator()](#XrplAccount+getWalletLocator) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
    * [.getDomain()](#XrplAccount+getDomain) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
    * [.getTrustLines([currency], issuer)](#XrplAccount+getTrustLines) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getChecks(fromAccount)](#XrplAccount+getChecks) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNfts()](#XrplAccount+getNfts) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getOffers()](#XrplAccount+getOffers) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNftOffers()](#XrplAccount+getNftOffers) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNftByUri(uri, [isHexUri])](#XrplAccount+getNftByUri) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
    * [.getAccountObjects(options)](#XrplAccount+getAccountObjects) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNamespaceEntries(namespaceId, [options])](#XrplAccount+getNamespaceEntries) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getFlags()](#XrplAccount+getFlags) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getAccountTrx([minLedgerIndex], [maxLedgerIndex], [isForward])](#XrplAccount+getAccountTrx) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.hasValidKeyPair()](#XrplAccount+hasValidKeyPair) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.setAccountFields(fields, options)](#XrplAccount+setAccountFields) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareSetAccountFields(fields, [options])](#XrplAccount+prepareSetAccountFields) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.setSignerList(signerList, [options])](#XrplAccount+setSignerList) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareSetSignerList(signerList, options)](#XrplAccount+prepareSetSignerList) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.invoke(toAddr, [blobObj], [options])](#XrplAccount+invoke) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareInvoke(toAddr, [blobObj], [options])](#XrplAccount+prepareInvoke) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.makePayment(toAddr, amount, [currency], [issuer], [memos], [options])](#XrplAccount+makePayment) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareMakePayment(toAddr, amount, [currency], [issuer], [memos], [options])](#XrplAccount+prepareMakePayment) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.setTrustLine(currency, issuer, limit, [allowRippling], [memos], [options])](#XrplAccount+setTrustLine) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareSetTrustLine(currency, issuer, limit, [allowRippling], [memos], [options])](#XrplAccount+prepareSetTrustLine) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.setRegularKey(regularKey, [memos], [options])](#XrplAccount+setRegularKey) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareSetRegularKey(regularKey, [memos], [options])](#XrplAccount+prepareSetRegularKey) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareCashCheck(check, [options])](#XrplAccount+prepareCashCheck) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.offerSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options])](#XrplAccount+offerSell) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareOfferSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options])](#XrplAccount+prepareOfferSell) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.offerBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options])](#XrplAccount+offerBuy) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareOfferBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options])](#XrplAccount+prepareOfferBuy) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.cancelOffer(offerSequence, [memos], [options])](#XrplAccount+cancelOffer) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareCancelOffer(offerSequence, [memos], [options])](#XrplAccount+prepareCancelOffer) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.subscribe()](#XrplAccount+subscribe) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.unsubscribe()](#XrplAccount+unsubscribe) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.submitTransactionBlob(txBlob)](#XrplAccount+submitTransactionBlob) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.sign(tx, [isMultiSign])](#XrplAccount+sign) ⇒ <code>Object</code>
    * [.mintURIToken(uri, [digest], [flags], [options])](#XrplAccount+mintURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareMintURIToken(uri, [digest], [flags], [options])](#XrplAccount+prepareMintURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.burnURIToken(uriTokenID, [options])](#XrplAccount+burnURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareBurnURIToken(uriTokenID, [options])](#XrplAccount+prepareBurnURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.sellURIToken(uriTokenID, amount, currency, [issuer], [toAddr], [memos], [options])](#XrplAccount+sellURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareSellURIToken(uriTokenID, amount, currency, [issuer], [toAddr], [memos], [options])](#XrplAccount+prepareSellURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.buyURIToken(uriToken, [memos], [options])](#XrplAccount+buyURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareBuyURIToken(uriToken, [memos], [options])](#XrplAccount+prepareBuyURIToken) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.clearURITokenOffer(uriTokenID, [options])](#XrplAccount+clearURITokenOffer) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.prepareClearURITokenOffer(uriTokenID, [options])](#XrplAccount+prepareClearURITokenOffer) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getURITokens(options)](#XrplAccount+getURITokens) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.getURITokenByUri(uri, [isHexUri])](#XrplAccount+getURITokenByUri) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.generateIssuedURITokenId(uri, [isHexUri])](#XrplAccount+generateIssuedURITokenId) ⇒ <code>string</code>
    * [.signAndSubmit(preparedTransaction, submissionRef)](#XrplAccount+signAndSubmit) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.submitMultisigned(tx)](#XrplAccount+submitMultisigned) ⇒ <code>Promise.&lt;Object&gt;</code>

<a name="new_XrplAccount_new"></a>

### new XrplAccount(address, secret, options)
Constructs an XrplAccount instance.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> \| <code>null</code> | <code>null</code> | The account address (optional). |
| secret | <code>string</code> \| <code>null</code> | <code>null</code> | The secret key (optional). |
| options | <code>Object</code> |  | Additional options (optional). |

<a name="XrplAccount+on"></a>

### xrplAccount.on(event, handler)
Adds an event listener for the specified event.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event. |
| handler | <code>function</code> | The event handler function. |

<a name="XrplAccount+once"></a>

### xrplAccount.once(event, handler)
Adds a one-time event listener for the specified event.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The name of the event. |
| handler | <code>function</code> | The event handler function. |

<a name="XrplAccount+off"></a>

### xrplAccount.off(event, handler)
Removes an event listener for the specified event.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | The name of the event. |
| handler | <code>function</code> \| <code>null</code> | <code></code> | The event handler function (optional). |

<a name="XrplAccount+deriveKeypair"></a>

### xrplAccount.deriveKeypair() ⇒ <code>Object</code>
Derives the keypair from the account secret.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Object</code> - The derived keypair.  
**Throws**:

- Will throw an error if the account secret is empty.

<a name="XrplAccount+exists"></a>

### xrplAccount.exists() ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if the account exists.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the account exists, otherwise false.  
<a name="XrplAccount+getInfo"></a>

### xrplAccount.getInfo() ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves account information.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The account information.  
<a name="XrplAccount+getSequence"></a>

### xrplAccount.getSequence() ⇒ <code>Promise.&lt;number&gt;</code>
Gets the account's sequence number.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;number&gt;</code> - The account's sequence number.  
<a name="XrplAccount+getMintedNFTokens"></a>

### xrplAccount.getMintedNFTokens() ⇒ <code>Promise.&lt;number&gt;</code>
Retrieves the number of NFTs minted by the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;number&gt;</code> - The number of minted NFTs.  
<a name="XrplAccount+getBurnedNFTokens"></a>

### xrplAccount.getBurnedNFTokens() ⇒ <code>number</code>
Retrieves the number of NFTs burned by the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>number</code> - The number of burned NFTs.  
<a name="XrplAccount+getMessageKey"></a>

### xrplAccount.getMessageKey() ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Retrieves the account's message key.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - The message key or null if not set.  
<a name="XrplAccount+getWalletLocator"></a>

### xrplAccount.getWalletLocator() ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Retrieves the wallet locator from the account info.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - The wallet locator or null if not found.  
<a name="XrplAccount+getDomain"></a>

### xrplAccount.getDomain() ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Retrieves the domain from the account info and converts it from hex to ASCII.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - The domain as ASCII or null if not found.  
<a name="XrplAccount+getTrustLines"></a>

### xrplAccount.getTrustLines([currency], issuer) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves the trust lines for the account, filtered by currency and issuer.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The list of trust lines, filtered if a currency is specified.  

| Param | Type | Description |
| --- | --- | --- |
| [currency] | <code>string</code> | The currency to filter by. |
| issuer | <code>string</code> | The issuer of the trust lines. |

<a name="XrplAccount+getChecks"></a>

### xrplAccount.getChecks(fromAccount) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves the checks for the specified account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The list of checks.  

| Param | Type | Description |
| --- | --- | --- |
| fromAccount | <code>string</code> | The account from which to retrieve checks. |

<a name="XrplAccount+getNfts"></a>

### xrplAccount.getNfts() ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves the NFTs for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The list of NFTs.  
<a name="XrplAccount+getOffers"></a>

### xrplAccount.getOffers() ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves the offers for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The list of offers.  
<a name="XrplAccount+getNftOffers"></a>

### xrplAccount.getNftOffers() ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves the NFT offers for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The list of NFT offers.  
<a name="XrplAccount+getNftByUri"></a>

### xrplAccount.getNftByUri(uri, [isHexUri]) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Retrieves a specific NFT by its URI.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - The NFT object or null if not found.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uri | <code>string</code> |  | The URI of the NFT to retrieve. |
| [isHexUri] | <code>boolean</code> | <code>false</code> | Whether the URI is in hexadecimal format. |

<a name="XrplAccount+getAccountObjects"></a>

### xrplAccount.getAccountObjects(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves account objects for the account with the specified options.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The list of account objects.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | The options for retrieving account objects. |

<a name="XrplAccount+getNamespaceEntries"></a>

### xrplAccount.getNamespaceEntries(namespaceId, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Retrieves namespace entries for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The list of namespace entries.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| namespaceId | <code>string</code> |  | The ID of the namespace to retrieve entries for. |
| [options] | <code>Object</code> | <code>{}</code> | The options for retrieving namespace entries. |

<a name="XrplAccount+getFlags"></a>

### xrplAccount.getFlags() ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves the flags set on the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The account flags.  
<a name="XrplAccount+getAccountTrx"></a>

### xrplAccount.getAccountTrx([minLedgerIndex], [maxLedgerIndex], [isForward]) ⇒ <code>Promise.&lt;Array&gt;</code>
Retrieves account transactions within a specified ledger range.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - The list of transactions.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [minLedgerIndex] | <code>number</code> | <code>-1</code> | The minimum ledger index to retrieve transactions from. |
| [maxLedgerIndex] | <code>number</code> | <code>-1</code> | The maximum ledger index to retrieve transactions from. |
| [isForward] | <code>boolean</code> | <code>true</code> | Whether to retrieve transactions in forward order. |

<a name="XrplAccount+hasValidKeyPair"></a>

### xrplAccount.hasValidKeyPair() ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if the current wallet has a valid key pair for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the key pair is valid, otherwise false.  
<a name="XrplAccount+setAccountFields"></a>

### xrplAccount.setAccountFields(fields, options) ⇒ <code>Promise.&lt;Object&gt;</code>
Sets account fields.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The transaction result.  

| Param | Type | Description |
| --- | --- | --- |
| fields | <code>Object</code> | The fields to set. |
| options | <code>Object</code> | Additional transaction options (optional). |

<a name="XrplAccount+prepareSetAccountFields"></a>

### xrplAccount.prepareSetAccountFields(fields, [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares an AccountSet transaction with the specified fields and options.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared AccountSet transaction.  
**Throws**:

- Will throw an error if no fields are provided and `allowEmptyAccountSet` is not true.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| fields | <code>Object</code> |  | The fields to set for the account.  Example: { Domain: "www.mydomain.com", Flags: { asfDefaultRipple: false, asfDisableMaster: true } } |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. Can include hook parameters. |

<a name="XrplAccount+setSignerList"></a>

### xrplAccount.setSignerList(signerList, [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Sets the signer list for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| signerList | <code>Array</code> |  | The list of signers to set for the account. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for setting the signer list. |

<a name="XrplAccount+prepareSetSignerList"></a>

### xrplAccount.prepareSetSignerList(signerList, options) ⇒ <code>Promise.&lt;Object&gt;</code>
Set the signer list to the account. Setting signerQuorum = 0 in options, will remove the signerlist from the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Prepared transaction.  

| Param | Type | Description |
| --- | --- | --- |
| signerList | <code>\*</code> | (optional) An array of signers. Ex:  [ {account:"ras24cvffvfbvfbbt5or4332", weight: 1}, {}, ...] |
| options | <code>\*</code> | Ex:  {signerQuorum: 1, sequence: 6543233} |

<a name="XrplAccount+invoke"></a>

### xrplAccount.invoke(toAddr, [blobObj], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Invokes a transaction to a specified address.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| toAddr | <code>string</code> |  | The destination address. |
| [blobObj] | <code>Object</code> \| <code>null</code> | <code></code> | Optional blob object with data and its format. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareInvoke"></a>

### xrplAccount.prepareInvoke(toAddr, [blobObj], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares an invoke transaction.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared invoke transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| toAddr | <code>string</code> |  | The destination address. |
| [blobObj] | <code>Object</code> \| <code>null</code> | <code></code> | Blob object containing data and whether it's in hex. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+makePayment"></a>

### xrplAccount.makePayment(toAddr, amount, [currency], [issuer], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Makes a payment to the specified address.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| toAddr | <code>string</code> |  | The destination address. |
| amount | <code>number</code> \| <code>string</code> |  | The amount to send. |
| [currency] | <code>string</code> \| <code>null</code> | <code>null</code> | Optional currency code. |
| [issuer] | <code>string</code> \| <code>null</code> | <code>null</code> | Optional issuer for non-XRP currencies. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareMakePayment"></a>

### xrplAccount.prepareMakePayment(toAddr, amount, [currency], [issuer], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares a payment transaction.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared payment transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| toAddr | <code>string</code> |  | The destination address. |
| amount | <code>number</code> \| <code>string</code> |  | The amount to send. |
| [currency] | <code>string</code> \| <code>null</code> | <code>null</code> | Optional currency code. |
| [issuer] | <code>string</code> \| <code>null</code> | <code>null</code> | Optional issuer for non-XRP currencies. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+setTrustLine"></a>

### xrplAccount.setTrustLine(currency, issuer, limit, [allowRippling], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Sets a trust line with the specified parameters.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| currency | <code>string</code> |  | The currency code for the trust line. |
| issuer | <code>string</code> |  | The issuer of the currency. |
| limit | <code>string</code> |  | The limit for the trust line. |
| [allowRippling] | <code>boolean</code> | <code>false</code> | Whether to allow rippling. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareSetTrustLine"></a>

### xrplAccount.prepareSetTrustLine(currency, issuer, limit, [allowRippling], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares a trust line transaction.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared trust line transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| currency | <code>string</code> |  | The currency code for the trust line. |
| issuer | <code>string</code> |  | The issuer of the currency. |
| limit | <code>string</code> |  | The limit for the trust line. |
| [allowRippling] | <code>boolean</code> | <code>false</code> | Whether to allow rippling. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+setRegularKey"></a>

### xrplAccount.setRegularKey(regularKey, [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Sets the regular key for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| regularKey | <code>string</code> |  | The regular key to set. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareSetRegularKey"></a>

### xrplAccount.prepareSetRegularKey(regularKey, [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares a transaction to set the regular key for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared regular key transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| regularKey | <code>string</code> |  | The regular key to set. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareCashCheck"></a>

### xrplAccount.prepareCashCheck(check, [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Cashes a check for the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| check | <code>Object</code> |  | The check object with details. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+offerSell"></a>

### xrplAccount.offerSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Creates an offer to sell assets.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sellAmount | <code>number</code> \| <code>string</code> |  | The amount to sell. |
| sellCurrency | <code>string</code> |  | The currency code of the asset to sell. |
| sellIssuer | <code>string</code> |  | The issuer of the asset to sell. |
| forAmount | <code>number</code> \| <code>string</code> |  | The amount to receive. |
| forCurrency | <code>string</code> |  | The currency code of the asset to receive. |
| [forIssuer] | <code>string</code> \| <code>null</code> | <code>null</code> | The issuer of the asset to receive. |
| [expiration] | <code>number</code> | <code>4294967295</code> | The expiration time for the offer. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareOfferSell"></a>

### xrplAccount.prepareOfferSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares a transaction to sell assets.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared offer sell transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sellAmount | <code>number</code> \| <code>string</code> |  | The amount to sell. |
| sellCurrency | <code>string</code> |  | The currency code of the asset to sell. |
| sellIssuer | <code>string</code> |  | The issuer of the asset to sell. |
| forAmount | <code>number</code> \| <code>string</code> |  | The amount to receive. |
| forCurrency | <code>string</code> |  | The currency code of the asset to receive. |
| [forIssuer] | <code>string</code> \| <code>null</code> | <code>null</code> | The issuer of the asset to receive. |
| [expiration] | <code>number</code> | <code>4294967295</code> | The expiration time for the offer. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+offerBuy"></a>

### xrplAccount.offerBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Creates an offer to buy assets.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| buyAmount | <code>number</code> \| <code>string</code> |  | The amount to buy. |
| buyCurrency | <code>string</code> |  | The currency code of the asset to buy. |
| buyIssuer | <code>string</code> |  | The issuer of the asset to buy. |
| forAmount | <code>number</code> \| <code>string</code> |  | The amount to give in exchange. |
| forCurrency | <code>string</code> |  | The currency code of the asset to give in exchange. |
| [forIssuer] | <code>string</code> \| <code>null</code> | <code>null</code> | The issuer of the asset to give in exchange. |
| [expiration] | <code>number</code> | <code>4294967295</code> | The expiration time for the offer. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareOfferBuy"></a>

### xrplAccount.prepareOfferBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, [forIssuer], [expiration], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares an offer to buy assets.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared offer buy transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| buyAmount | <code>number</code> \| <code>string</code> |  | The amount to buy. |
| buyCurrency | <code>string</code> |  | The currency code of the asset to buy. |
| buyIssuer | <code>string</code> |  | The issuer of the asset to buy. |
| forAmount | <code>number</code> \| <code>string</code> |  | The amount to give in exchange. |
| forCurrency | <code>string</code> |  | The currency code of the asset to give in exchange. |
| [forIssuer] | <code>string</code> \| <code>null</code> | <code>null</code> | The issuer of the asset to give in exchange. |
| [expiration] | <code>number</code> | <code>4294967295</code> | The expiration time for the offer. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+cancelOffer"></a>

### xrplAccount.cancelOffer(offerSequence, [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Cancels an existing offer.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The result of the sign and submit operation.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| offerSequence | <code>number</code> |  | The sequence number of the offer to cancel. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareCancelOffer"></a>

### xrplAccount.prepareCancelOffer(offerSequence, [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares a transaction to cancel an offer.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared offer cancel transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| offerSequence | <code>number</code> |  | The sequence number of the offer to cancel. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+subscribe"></a>

### xrplAccount.subscribe() ⇒ <code>Promise.&lt;void&gt;</code>
Subscribes to the XRPL address stream for transaction updates.
Ensures only one subscription is active at a time.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
<a name="XrplAccount+unsubscribe"></a>

### xrplAccount.unsubscribe() ⇒ <code>Promise.&lt;void&gt;</code>
Unsubscribes from the XRPL address stream.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
<a name="XrplAccount+submitTransactionBlob"></a>

### xrplAccount.submitTransactionBlob(txBlob) ⇒ <code>Promise.&lt;Object&gt;</code>
Submits a signed raw transaction.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Result of the transaction submission.  

| Param | Type | Description |
| --- | --- | --- |
| txBlob | <code>string</code> | Signed and encoded transaction as a hex string. |

<a name="XrplAccount+sign"></a>

### xrplAccount.sign(tx, [isMultiSign]) ⇒ <code>Object</code>
Signs the given transaction and returns the signed blob and its hash.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Object</code> - The signed transaction hash and blob. Format: {hash: string, tx_blob: string}  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| tx | <code>Object</code> |  | Transaction object. |
| [isMultiSign] | <code>boolean</code> | <code>false</code> | Whether the transaction is for multisigning. |

<a name="XrplAccount+mintURIToken"></a>

### xrplAccount.mintURIToken(uri, [digest], [flags], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Mints a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Result of the mint transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uri | <code>string</code> |  | The URI to mint as a token. |
| [digest] | <code>string</code> \| <code>null</code> | <code>null</code> | The optional digest for the token. |
| [flags] | <code>Object</code> | <code>{}</code> | Flags to control token properties (e.g., isBurnable). |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareMintURIToken"></a>

### xrplAccount.prepareMintURIToken(uri, [digest], [flags], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares the minting of a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared mint transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uri | <code>string</code> |  | The URI to mint as a token. |
| [digest] | <code>string</code> \| <code>null</code> | <code>null</code> | The optional digest for the token. |
| [flags] | <code>Object</code> | <code>{}</code> | Flags to control token properties. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+burnURIToken"></a>

### xrplAccount.burnURIToken(uriTokenID, [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Burns a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Result of the burn transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriTokenID | <code>string</code> |  | The ID of the URI token to burn. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareBurnURIToken"></a>

### xrplAccount.prepareBurnURIToken(uriTokenID, [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares the burning of a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared burn transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriTokenID | <code>string</code> |  | The ID of the URI token to burn. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+sellURIToken"></a>

### xrplAccount.sellURIToken(uriTokenID, amount, currency, [issuer], [toAddr], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Creates a sell offer for a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Result of the sell transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriTokenID | <code>string</code> |  | The ID of the URI token to sell. |
| amount | <code>string</code> \| <code>number</code> |  | The amount to sell the token for. |
| currency | <code>string</code> |  | The currency code for the sale. |
| [issuer] | <code>string</code> \| <code>null</code> | <code>null</code> | The issuer of the currency. |
| [toAddr] | <code>string</code> \| <code>null</code> | <code>null</code> | The address of the buyer. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareSellURIToken"></a>

### xrplAccount.prepareSellURIToken(uriTokenID, amount, currency, [issuer], [toAddr], [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares a sell offer for a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared sell offer transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriTokenID | <code>string</code> |  | The ID of the URI token to sell. |
| amount | <code>string</code> \| <code>number</code> |  | The amount to sell the token for. |
| currency | <code>string</code> |  | The currency code for the sale. |
| [issuer] | <code>string</code> \| <code>null</code> | <code>null</code> | The issuer of the currency. |
| [toAddr] | <code>string</code> \| <code>null</code> | <code>null</code> | The address of the buyer. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+buyURIToken"></a>

### xrplAccount.buyURIToken(uriToken, [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Buys a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Result of the buy transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriToken | <code>Object</code> |  | The URI token object to buy. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareBuyURIToken"></a>

### xrplAccount.prepareBuyURIToken(uriToken, [memos], [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares a buy offer for a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared buy offer transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriToken | <code>Object</code> |  | The URI token object to buy. |
| [memos] | <code>Array</code> \| <code>null</code> | <code></code> | Optional memos to attach to the transaction. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+clearURITokenOffer"></a>

### xrplAccount.clearURITokenOffer(uriTokenID, [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Clears a sell offer for a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Result of the clear offer transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriTokenID | <code>string</code> |  | The ID of the URI token offer to clear. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+prepareClearURITokenOffer"></a>

### xrplAccount.prepareClearURITokenOffer(uriTokenID, [options]) ⇒ <code>Promise.&lt;Object&gt;</code>
Prepares the clearing of a sell offer for a URI token.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The prepared clear offer transaction.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uriTokenID | <code>string</code> |  | The ID of the URI token offer to clear. |
| [options] | <code>Object</code> | <code>{}</code> | Additional options for the transaction. |

<a name="XrplAccount+getURITokens"></a>

### xrplAccount.getURITokens(options) ⇒ <code>Promise.&lt;Array&gt;</code>
Retrieves all URI tokens associated with the account.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - List of URI tokens.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Additional options for the retrieval. |

<a name="XrplAccount+getURITokenByUri"></a>

### xrplAccount.getURITokenByUri(uri, [isHexUri]) ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves a URI token by its URI.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The URI token object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uri | <code>string</code> |  | The URI of the token to retrieve. |
| [isHexUri] | <code>boolean</code> | <code>false</code> | Whether the URI is in hex format. |

<a name="XrplAccount+generateIssuedURITokenId"></a>

### xrplAccount.generateIssuedURITokenId(uri, [isHexUri]) ⇒ <code>string</code>
Generates the issued URI token ID from a given URI.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>string</code> - The generated URI token ID.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| uri | <code>string</code> |  | The URI to generate the token ID from. |
| [isHexUri] | <code>boolean</code> | <code>false</code> | Whether the URI is in hex format. |

<a name="XrplAccount+signAndSubmit"></a>

### xrplAccount.signAndSubmit(preparedTransaction, submissionRef) ⇒ <code>Promise.&lt;Object&gt;</code>
Sign and submit prepared transaction.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - result of the submitted transaction.  

| Param | Type | Description |
| --- | --- | --- |
| preparedTransaction | <code>object</code> | Prepared transaction. |
| submissionRef | <code>object</code> | [Optional] Reference object to take submission references. |

<a name="XrplAccount+submitMultisigned"></a>

### xrplAccount.submitMultisigned(tx) ⇒ <code>Promise.&lt;Object&gt;</code>
Submit a multi-singed transaction.

**Kind**: instance method of [<code>XrplAccount</code>](#XrplAccount)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Result of the transaction.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | Signed transaction. |

<a name="XrplApi"></a>

## XrplApi
Class representing an XRPL API client.

**Kind**: global class  

* [XrplApi](#XrplApi)
    * [new XrplApi(rippledServer, [options])](#new_XrplApi_new)
    * [.on(event, handler)](#XrplApi+on)
    * [.once(event, handler)](#XrplApi+once)
    * [.off(event, [handler])](#XrplApi+off)
    * [.connect()](#XrplApi+connect) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.disconnect()](#XrplApi+disconnect) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.isValidKeyForAddress(publicKey, address)](#XrplApi+isValidKeyForAddress) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.isAccountExists(address)](#XrplApi+isAccountExists) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.getServerState([ledgerIdx])](#XrplApi+getServerState) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.getAccountInfo(address)](#XrplApi+getAccountInfo) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getServerDefinition()](#XrplApi+getServerDefinition) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getServerInfo()](#XrplApi+getServerInfo) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getAccountObjects(address, [options])](#XrplApi+getAccountObjects) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNamespaceEntries(address, namespaceId, [options])](#XrplApi+getNamespaceEntries) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNftOffers(address, [options])](#XrplApi+getNftOffers) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getTrustlines(address, [options])](#XrplApi+getTrustlines) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getAccountTrx(address, [options])](#XrplApi+getAccountTrx) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getNfts(address, [options])](#XrplApi+getNfts) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getOffers(address, [options])](#XrplApi+getOffers) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getSellOffers(nfTokenId, [options])](#XrplApi+getSellOffers) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getBuyOffers(nfTokenId, [options])](#XrplApi+getBuyOffers) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getLedgerEntry(index, [options])](#XrplApi+getLedgerEntry) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
    * [.getURITokenByIndex(index)](#XrplApi+getURITokenByIndex) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
    * [.getTxnInfo(txnHash, options)](#XrplApi+getTxnInfo) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.subscribeToAddress(address, handler)](#XrplApi+subscribeToAddress) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.unsubscribeFromAddress(address, handler)](#XrplApi+unsubscribeFromAddress) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.getTransactionFee(txBlob)](#XrplApi+getTransactionFee) ⇒ <code>Promise.&lt;number&gt;</code>
    * [.getTransactionValidatedResults(txHash)](#XrplApi+getTransactionValidatedResults) ⇒
    * [.submitMultisignedAndWait(tx, submissionRef)](#XrplApi+submitMultisignedAndWait) ⇒
    * [.submitMultisigned(tx)](#XrplApi+submitMultisigned) ⇒
    * [.submitAndWait(tx_blob, submissionRef)](#XrplApi+submitAndWait) ⇒
    * [.submit(tx_blob)](#XrplApi+submit) ⇒
    * [.multiSign(transactions)](#XrplApi+multiSign) ⇒ <code>string</code>

<a name="new_XrplApi_new"></a>

### new XrplApi(rippledServer, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| rippledServer | <code>string</code> \| <code>null</code> | <code>null</code> | The URL of the primary rippled server or null if not used. |
| [options] | <code>Object</code> | <code>{}</code> | Optional configuration options. |
| [options.fallbackRippledServers] | <code>Array.&lt;string&gt;</code> | <code>[]</code> | List of fallback server URLs. |
| [options.xrplClientOptions] | <code>Object</code> | <code>{}</code> | Options for the xrpl client. |
| [options.autoReconnect] | <code>boolean</code> | <code>true</code> | Whether to automatically reconnect. |

<a name="XrplApi+on"></a>

### xrplApi.on(event, handler)
Adds an event listener for a specified event.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The event to listen for. |
| handler | <code>function</code> | The function to call when the event occurs. |

<a name="XrplApi+once"></a>

### xrplApi.once(event, handler)
Adds a one-time event listener for a specified event.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | The event to listen for. |
| handler | <code>function</code> | The function to call when the event occurs. |

<a name="XrplApi+off"></a>

### xrplApi.off(event, [handler])
Removes an event listener for a specified event.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | <code>string</code> |  | The event to stop listening for. |
| [handler] | <code>function</code> | <code></code> | The function to remove or null to remove all handlers. |

<a name="XrplApi+connect"></a>

### xrplApi.connect() ⇒ <code>Promise.&lt;void&gt;</code>
Connects to the XRPL API.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
<a name="XrplApi+disconnect"></a>

### xrplApi.disconnect() ⇒ <code>Promise.&lt;void&gt;</code>
Disconnects from the XRPL API.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
<a name="XrplApi+isValidKeyForAddress"></a>

### xrplApi.isValidKeyForAddress(publicKey, address) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if the given public key is valid for the specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Returns true if the public key is valid for the address.  

| Param | Type | Description |
| --- | --- | --- |
| publicKey | <code>string</code> | The public key to check. |
| address | <code>string</code> | The address to check against. |

<a name="XrplApi+isAccountExists"></a>

### xrplApi.isAccountExists(address) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if an account exists at the specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Returns true if the account exists.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The account address. |

<a name="XrplApi+getServerState"></a>

### xrplApi.getServerState([ledgerIdx]) ⇒ <code>Promise.&lt;string&gt;</code>
Gets the server state at the specified ledger index.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;string&gt;</code> - The server state.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [ledgerIdx] | <code>string</code> | <code>&quot;\&quot;current\&quot;&quot;</code> | The ledger index to get the state for. |

<a name="XrplApi+getAccountInfo"></a>

### xrplApi.getAccountInfo(address) ⇒ <code>Promise.&lt;Object&gt;</code>
Gets account information for a specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The account information.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The account address. |

<a name="XrplApi+getServerDefinition"></a>

### xrplApi.getServerDefinition() ⇒ <code>Promise.&lt;Object&gt;</code>
Gets the server definitions.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The server definitions.  
<a name="XrplApi+getServerInfo"></a>

### xrplApi.getServerInfo() ⇒ <code>Promise.&lt;Object&gt;</code>
Gets information about the server.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The server information.  
<a name="XrplApi+getAccountObjects"></a>

### xrplApi.getAccountObjects(address, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets account objects for a specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The account objects.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> |  | The account address. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getNamespaceEntries"></a>

### xrplApi.getNamespaceEntries(address, namespaceId, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets namespace entries for a specified address and namespace ID.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The namespace entries.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> |  | The account address. |
| namespaceId | <code>string</code> |  | The namespace ID. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getNftOffers"></a>

### xrplApi.getNftOffers(address, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets NFT offers for a specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The NFT offers.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> |  | The account address. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getTrustlines"></a>

### xrplApi.getTrustlines(address, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets trustlines for a specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The trustlines.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> |  | The account address. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getAccountTrx"></a>

### xrplApi.getAccountTrx(address, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets account transactions for a specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The account transactions.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> |  | The account address. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getNfts"></a>

### xrplApi.getNfts(address, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets NFTs for a specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The NFTs.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> |  | The account address. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getOffers"></a>

### xrplApi.getOffers(address, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets offers for a specified address.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The offers.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>string</code> |  | The account address. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getSellOffers"></a>

### xrplApi.getSellOffers(nfTokenId, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets sell offers for a specified NFT token ID.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The sell offers.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| nfTokenId | <code>string</code> |  | The NFT token ID. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getBuyOffers"></a>

### xrplApi.getBuyOffers(nfTokenId, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Gets buy offers for a specified NFT token ID.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The buy offers.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| nfTokenId | <code>string</code> |  | The NFT token ID. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getLedgerEntry"></a>

### xrplApi.getLedgerEntry(index, [options]) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Gets ledger entry by index.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - The ledger entry or null if not found.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>string</code> |  | The ledger index. |
| [options] | <code>Object</code> | <code>{}</code> | Optional parameters for the request. |

<a name="XrplApi+getURITokenByIndex"></a>

### xrplApi.getURITokenByIndex(index) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Gets the URI token by index.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - The URI token entry or null if not found.  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>string</code> | The index of the URI token. |

<a name="XrplApi+getTxnInfo"></a>

### xrplApi.getTxnInfo(txnHash, options) ⇒ <code>Promise.&lt;Object&gt;</code>
Gets transaction information.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The transaction information.  

| Param | Type | Description |
| --- | --- | --- |
| txnHash | <code>string</code> | The hash of the transaction. |
| options | <code>Object</code> | Optional parameters for the request. |

<a name="XrplApi+subscribeToAddress"></a>

### xrplApi.subscribeToAddress(address, handler) ⇒ <code>Promise.&lt;void&gt;</code>
Subscribes to address updates.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The address to subscribe to. |
| handler | <code>function</code> | The handler function for address updates. |

<a name="XrplApi+unsubscribeFromAddress"></a>

### xrplApi.unsubscribeFromAddress(address, handler) ⇒ <code>Promise.&lt;void&gt;</code>
Unsubscribes from address updates.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | The address to unsubscribe from. |
| handler | <code>function</code> | The handler function to remove. |

<a name="XrplApi+getTransactionFee"></a>

### xrplApi.getTransactionFee(txBlob) ⇒ <code>Promise.&lt;number&gt;</code>
Gets the transaction fee.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>Promise.&lt;number&gt;</code> - The transaction fee.  

| Param | Type | Description |
| --- | --- | --- |
| txBlob | <code>string</code> | The transaction blob. |

<a name="XrplApi+getTransactionValidatedResults"></a>

### xrplApi.getTransactionValidatedResults(txHash) ⇒
Get the transaction results if validated.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: Validated results of the transaction.  

| Param | Type | Description |
| --- | --- | --- |
| txHash | <code>string</code> | Hash of the transaction to check. |

<a name="XrplApi+submitMultisignedAndWait"></a>

### xrplApi.submitMultisignedAndWait(tx, submissionRef) ⇒
Submit a multi-signature transaction and wait for validation.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: response object of the validated transaction.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | Multi-signed transaction object. |
| submissionRef | <code>object</code> | [Optional] Reference object to take submission references. |

<a name="XrplApi+submitMultisigned"></a>

### xrplApi.submitMultisigned(tx) ⇒
Only submit a multi-signature transaction.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: response object of the submitted transaction.  

| Param | Type | Description |
| --- | --- | --- |
| tx | <code>object</code> | Multi-signed transaction object. |

<a name="XrplApi+submitAndWait"></a>

### xrplApi.submitAndWait(tx_blob, submissionRef) ⇒
Submit a single-signature transaction.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: response object of the validated transaction.  

| Param | Type | Description |
| --- | --- | --- |
| tx_blob | <code>string</code> | Signed transaction object. |
| submissionRef | <code>object</code> | [Optional] Reference object to take submission references. |

<a name="XrplApi+submit"></a>

### xrplApi.submit(tx_blob) ⇒
Only submit a single-signature transaction.

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: response object of the submitted transaction.  

| Param | Type | Description |
| --- | --- | --- |
| tx_blob | <code>string</code> | Signed transaction object. |

<a name="XrplApi+multiSign"></a>

### xrplApi.multiSign(transactions) ⇒ <code>string</code>
Joins the given array of signed transactions into one multi-signed transaction.
For more details: https://js.xrpl.org/functions/multisign.html

**Kind**: instance method of [<code>XrplApi</code>](#XrplApi)  
**Returns**: <code>string</code> - A single multi-signed transaction in string format that contains all signers from the input transactions.  
**Throws**:

- <code>Error</code> If the transactions array is empty.


| Param | Type | Description |
| --- | --- | --- |
| transactions | <code>Array.&lt;(string\|object)&gt;</code> | An array of signed transactions, either as serialized strings or transaction objects, to combine into a single multi-signed transaction. |


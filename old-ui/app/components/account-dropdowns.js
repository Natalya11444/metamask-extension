const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const actions = require('../../../ui/app/actions')
const genAccountLink = require('etherscan-link').createAccountLink
const connect = require('react-redux').connect
const Dropdown = require('./dropdown').Dropdown
const DropdownMenuItem = require('./dropdown').DropdownMenuItem
const Identicon = require('./identicon')
const ethUtil = require('ethereumjs-util')
const copyToClipboard = require('copy-to-clipboard')

class AccountDropdowns extends Component {
  constructor (props) {
    super(props)
    this.state = {
      accountSelectorActive: false,
      optionsMenuActive: false,
    }
    this.accountSelectorToggleClassName = 'accounts-selector'
    this.optionsMenuToggleClassName = 'account-dropdown'
  }

  renderAccounts () {
    const { identities, selected, keyrings } = this.props
    const accountOrder = keyrings.reduce((list, keyring) => list.concat(keyring.accounts), [])

    return accountOrder.map((address, index) => {
      const identity = identities[address]
      const isSelected = identity.address === selected

      const simpleAddress = identity.address.substring(2).toLowerCase()

      const keyring = keyrings.find((kr) => {
        return kr.accounts.includes(simpleAddress) ||
          kr.accounts.includes(identity.address)
      })

      return h(
        DropdownMenuItem,
        {
          closeMenu: () => {},
          onClick: () => {
            this.props.actions.showAccountDetail(identity.address)
          },
          style: {
            marginTop: index === 0 ? '5px' : '',
            fontSize: '16px',
          },
        },
        [
          isSelected ? h('div', {
            style: {
              width: '4px',
              height: '32px',
              background: '#8fdc97',
              position: 'absolute',
              left: '-25px',
            },
          }) : null,
          h(
            Identicon,
            {
              overflow: 'none',
              address: identity.address,
              diameter: 32,
              style: {
                marginLeft: '10px',
              },
            },
          ),
          this.indicateIfLoose(keyring),
          h('span', {
            style: {
              marginLeft: '20px',
              fontSize: '16px',
              maxWidth: '145px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: isSelected ? 'white' : '',
            },
          }, identity.name || ''),
        ]
      )
    })
  }

  indicateIfLoose (keyring) {
    try { // Sometimes keyrings aren't loaded yet:
      const type = keyring.type
      const isLoose = type !== 'HD Key Tree'
      return isLoose ? h('.keyring-label', 'IMPORTED') : null
    } catch (e) { return }
  }

  renderAccountSelector () {
    const { actions } = this.props
    const { accountSelectorActive } = this.state

    return h(
      Dropdown,
      {
        useCssTransition: true, // Hardcoded because account selector is temporarily in app-header
        style: {
          marginLeft: '-168px',
          marginTop: '32px',
          minWidth: '180px',
          overflowY: 'auto',
          maxHeight: '300px',
          width: '220px',
        },
        innerStyle: {
          padding: '8px 25px',
        },
        isOpen: accountSelectorActive,
        onClickOutside: (event) => {
          const { classList } = event.target
          const isNotToggleElement = !classList.contains(this.accountSelectorToggleClassName)
          if (accountSelectorActive && isNotToggleElement) {
            this.setState({ accountSelectorActive: false })
          }
        },
      },
      [
        ...this.renderAccounts(),
        h(
          DropdownMenuItem,
          {
            closeMenu: () => {},
            onClick: () => actions.addNewAccount(),
          },
          [
            h('span', { style: { fontSize: '16px', color: '#8fdc97' } }, 'Create Account'),
          ],
        ),
        h(
          DropdownMenuItem,
          {
            closeMenu: () => {},
            onClick: () => actions.showImportPage(),
          },
          [
            h('span', {
              style: {
                fontSize: '16px',
                marginBottom: '5px',
                color: '#8fdc97',
              },
            }, 'Import Account'),
          ]
        ),
      ]
    )
  }

  genPOAEplorerAccountLink (selected, network) {
    const isSokol = parseInt(network) === 77
    const isPOA = parseInt(network) === 99
    if (isSokol) {
      return `https://sokol.poaexplorer.com/address/search/${selected}`
    }
    if (isPOA) {
      return `https://poaexplorer.com/address/search/${selected}`
    }

    return ''
  }

  renderAccountOptions () {
    const { actions, network } = this.props
    const { optionsMenuActive } = this.state

    const isSokol = parseInt(network) === 77
    const isPOA = parseInt(network) === 99
    const explorerStr = (isSokol || isPOA) ? 'POA explorer' : 'Etherscan'

    return h(
      Dropdown,
      {
        style: {
          marginLeft: '-237px',
          minWidth: '180px',
          marginTop: '30px',
        },
        isOpen: optionsMenuActive,
        onClickOutside: (event) => {
          const { classList } = event.target
          const isNotToggleElement = !classList.contains(this.optionsMenuToggleClassName)
          if (optionsMenuActive && isNotToggleElement) {
            this.setState({ optionsMenuActive: false })
          }
        },
      },
      [
        h(
          DropdownMenuItem,
          {
            closeMenu: () => {},
            onClick: () => {
              const { selected, network } = this.props
              const url = (isSokol || isPOA) ? this.genPOAEplorerAccountLink(selected, network) : genAccountLink(selected, network)
              global.platform.openWindow({ url })
            },
          },
          `View account on ${explorerStr}`,
        ),
        h(
          DropdownMenuItem,
          {
            closeMenu: () => {},
            onClick: () => {
              const { selected, identities } = this.props
              var identity = identities[selected]
              actions.showQrView(selected, identity ? identity.name : '')
            },
          },
          'Show QR Code',
        ),
        h(
          DropdownMenuItem,
          {
            closeMenu: () => {},
            onClick: () => {
              const { selected } = this.props
              const checkSumAddress = selected && ethUtil.toChecksumAddress(selected)
              copyToClipboard(checkSumAddress)
            },
          },
          'Copy Address to clipboard',
        ),
        h(
          DropdownMenuItem,
          {
            closeMenu: () => {},
            onClick: () => {
              actions.requestAccountExport()
            },
          },
          'Export Private Key',
        ),
      ]
    )
  }

  render () {
    const { style, enableAccountsSelector, enableAccountOptions } = this.props
    const { optionsMenuActive, accountSelectorActive } = this.state

    return h(
      'span',
      {
        style: style,
      },
      [
        enableAccountsSelector && h(
          // 'i.fa.fa-angle-down',
          'div.accounts-selector',
          {
            style: {
              // fontSize: '1.8em',
              background: 'url(images/switch_acc.svg) white center center no-repeat',
              height: '25px',
              width: '25px',
              marginRight: '3px',
            },
            onClick: (event) => {
              event.stopPropagation()
              this.setState({
                accountSelectorActive: !accountSelectorActive,
                optionsMenuActive: false,
              })
            },
          },
          this.renderAccountSelector(),
        ),
        enableAccountOptions && h(
          'div.account-dropdown',
          {
            style: {
              backgroundImage: 'url(../images/more.svg)',
              width: '30px',
              height: '24px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            },
            onClick: (event) => {
              event.stopPropagation()
              this.setState({
                accountSelectorActive: false,
                optionsMenuActive: !optionsMenuActive,
              })
            },
          },
          this.renderAccountOptions()
        ),
      ]
    )
  }
}

AccountDropdowns.defaultProps = {
  enableAccountsSelector: false,
  enableAccountOptions: false,
}

AccountDropdowns.propTypes = {
  identities: PropTypes.objectOf(PropTypes.object),
  selected: PropTypes.string,
  keyrings: PropTypes.array,
  actions: PropTypes.objectOf(PropTypes.func),
  network: PropTypes.string,
  style: PropTypes.object,
  enableAccountOptions: PropTypes.bool,
  enableAccountsSelector: PropTypes.bool,
}

const mapDispatchToProps = (dispatch) => {
  return {
    actions: {
      showConfigPage: () => dispatch(actions.showConfigPage()),
      requestAccountExport: () => dispatch(actions.requestExportAccount()),
      showAccountDetail: (address) => dispatch(actions.showAccountDetail(address)),
      addNewAccount: () => dispatch(actions.addNewAccount()),
      showImportPage: () => dispatch(actions.showImportPage()),
      showQrView: (selected, identity) => dispatch(actions.showQrView(selected, identity)),
    },
  }
}

module.exports = {
  AccountDropdowns: connect(null, mapDispatchToProps)(AccountDropdowns),
}

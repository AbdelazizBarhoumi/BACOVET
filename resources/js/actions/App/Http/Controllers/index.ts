import Api from './Api'
import BrowserLogController from './BrowserLogController'
import Settings from './Settings'
const Controllers = {
    Api: Object.assign(Api, Api),
BrowserLogController: Object.assign(BrowserLogController, BrowserLogController),
Settings: Object.assign(Settings, Settings),
}

export default Controllers
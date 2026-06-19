import BrowserLogController from './BrowserLogController'
import Api from './Api'
import Settings from './Settings'
const Controllers = {
    BrowserLogController: Object.assign(BrowserLogController, BrowserLogController),
Api: Object.assign(Api, Api),
Settings: Object.assign(Settings, Settings),
}

export default Controllers
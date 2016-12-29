
const {app,BrowserWindow,crashReporter} = require('electron');  // Module to control application life.

app.commandLine.appendSwitch('enable-unsafe-es3-apis');

crashReporter.start({
  productName: 'webgllab',
  companyName: 'layabox',
  submitURL: 'https://your-domain.com/url-to-submit',
  autoSubmit: true   
} );

var mainWindow = null;

app.on('window-all-closed', function() {
    if(process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({width: 1080, height: 1024, frame:true});

    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.openDevTools();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});


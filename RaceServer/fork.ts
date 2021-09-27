import { configInst } from './lib/TeConfig';
import { isMaster, isWorker, fork } from 'cluster';

if (isMaster) {
    if (configInst.get("fork.open")) {
        let num = configInst.get("fork.num") || 1;
        console.log(num );
        for (let i = 1; i <= num; i++) {
            let str = i.toString();
            fork({
                file: 'config' + str + '.json',
                dfile: 'dynamic' + str + '.json'
            });
        }
    }
}

if (isWorker) {
    configInst.set_path(process.env.file, process.env.dfile);
    require('./app');
}

const { Builder, By } = require('selenium-webdriver');

async function main() {
    let driver = await new Builder().forBrowser('chrome').build();
    await driver.get('https://dcpool-test.byteark.cn/login/admin');
    let inputs = await driver.findElements(By.css('.login-container>div input'));
    await inputs[0].sendKeys('admin')
    await inputs[1].sendKeys('test123')

    let btns = await driver.findElements(By.css('.login-container>div:last-child button'));
    await btns[0].click();
    await driver.sleep(1000);//毫秒
    let menus = await driver.findElements(By.css('.el-aside>ul>li'));
    for (const item of menus) {
        await driver.sleep(300);//毫秒
        await item.click();
        // const childmeuns = await item.findElements(By.css('ul>li>ul>li'));
        // if (childmeuns.length > 0) {
        //     for (const li of childmeuns) {
        //         await li.click();
        //     }
        // }
        await item.click();

    }
    await driver.quit()
}
main();





var old = async function() {
    let driver = await new Builder().forBrowser('chrome').build();
    await driver.get('https://dcpool-test.byteark.cn/login/admin');
    let inputs = await driver.findElements(By.css('.login-container>div input'));
    console.log(inputs);
    await inputs[0].sendKeys('admin')
    await inputs[1].sendKeys('test123')
    // let pList = await driver.findElements(By.css('.item p'));

    // let jq = "var script = document.createElement('script');"
    // + "var filename = \"https://code.jquery.com/jquery-1.9.1.min.js\";"
    // + "script.setAttribute(\"type\",\"text/javascript\");"
    // + "script.setAttribute(\"src\", filename);"
    // + "if (typeof script!='undefined'){"
    // + "document.getElementsByTagName(\"head\")[0].appendChild(script);"
    // + "}"
    // driver.executeScript(jq)

    // await driver.sleep(2500);//毫秒

    // const res = await driver.executeScript('$(".login-container>div input")[0].value="admin"')

    // driver.executeAsyncScript('$(".login-container>div input")[1].value="test123"; $(".login-container>div:last-child button")[0].click()')
    let btns = await driver.findElements(By.css('.login-container>div:last-child button'));
    await btns[0].click();
    // await driver.sleep(500);//毫秒
    // driver.executeScript('$(".login-container>div:last-child button")[0].click()')
    // driver.executeAsyncScript('$(".login-container>div:last-child button")[0].click()')
    await driver.sleep(1000);//毫秒
    let menus = await driver.findElements(By.css('.el-aside>ul>li'));
    for (const item of menus) {
        await driver.sleep(300);//毫秒
        await item.click();
        // const childmeuns = await item.findElements(By.css('ul>li>ul>li'));
        // if (childmeuns.length > 0) {
        //     for (const li of childmeuns) {
        //         await li.click();
        //     }
        // }
        await item.click();
    }
}

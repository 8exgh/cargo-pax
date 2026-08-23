import { createJsonTranslator, createLanguageModel } from "typechat";
import * as fs from "fs";
import path from "path";
import striptags from "striptags";
import { removeExtraneousPhrases } from "./removeExtraneousPhrases";
export class TrackerHtmlAnalyzer {
    async processPage(html) {
        console.log('***html length', html.length);
        const schemaPath = path.join(__dirname, "shipmentTrackingStatus.ts");
        const model = createLanguageModel(process.env);
        const schema = fs.readFileSync(schemaPath, "utf8");
        const translator = createJsonTranslator(model, schema, "ShipmentTrackingStatus");
        // Remove <script/> and <style/>
        let stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        stripped = striptags(stripped);
        stripped = removeExtraneousPhrases(stripped);
        let lastStripped = "";
        do {
            lastStripped = stripped;
            stripped = stripped.replace(String.fromCharCode(32, 10), String.fromCharCode(10)).replace('    ', '   ').replace(String.fromCharCode(10, 10), String.fromCharCode(10));
        } while (stripped.length != lastStripped.length);
        fs.writeFile(path.join(__dirname, 'strippedMostRecent.txt'), stripped, (err) => { if (err) {
            console.error(`***write file failure: ${err}`);
        } });
        console.log('***html post stripping length is', stripped.length);
        // console.log('***stripped', stripped);
        // for(let i =0;i<stripped.length;i++) {
        //     console.log(`'${stripped[i]}' -> ${stripped[i].charCodeAt(0)}`);
        // }
        // throw new Error("re-enable translate");
        const response = await translator.translate(stripped);
        if (!response.success) {
            console.error('***translate failed', response.message);
            return;
        }
        return response.data;
    }
}
//# sourceMappingURL=trackerHtmlAnalyzer.js.map
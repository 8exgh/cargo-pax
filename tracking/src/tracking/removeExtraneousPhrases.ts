import {extraneousPhrases1} from "./extraneousPhrases1";
import {extraneousPhrases2} from "./extraneousPhrases2";
import {extraneousPhrases3} from "./extraneousPhrases3";

export function removeExtraneousPhrases(text: string): string {
    let phrasesToRemove = [...extraneousPhrases1, ...extraneousPhrases2, ...extraneousPhrases3];
    phrasesToRemove = phrasesToRemove.sort((a,b) => b.length - a.length);

    console.log('***phrasesToRemove', phrasesToRemove);
    let mutated = text;

    phrasesToRemove.forEach(phrase => {
        mutated = mutated.replace(phrase, '');
        // TODO: This one could possibly result in useful info being removed:
        phrase.split(",").forEach((phrasePortion) => mutated = mutated.replace(phrasePortion, ''));
    })

    console.log('***mutated', mutated);

    return mutated;
}
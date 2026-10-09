import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
test('provider chooser expands over the blurred button with keyboard and mobile support',async({page})=>{
 await page.goto(pathToFileURL(resolve('../website/index.html')).href);
 const trigger=page.getByRole('button',{name:/Download de nieuwste versie/}),som=page.locator('.provider-option').nth(0),magister=page.locator('.provider-option').nth(1);
 await expect(som).not.toBeVisible();await trigger.click();await expect(som).toBeVisible();await expect(som).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','true');
 await expect.poll(()=>trigger.evaluate(node=>getComputedStyle(node).filter)).toContain('blur(5px)');
 await page.keyboard.press('Tab');await expect(magister).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.click();await page.locator('h1').click();await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.click();await mkdir('test-results/website',{recursive:true});await page.screenshot({path:'test-results/website/download-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/website/download-mobile.png'});
 const box=await page.locator('.download-options').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await expect(som).toHaveAttribute('href',/CijferReveal\.zip$/);await expect(magister).toHaveAttribute('href',/CijferReveal-Magister\.zip$/);
 await magister.click();await expect(page.getByRole('dialog',{name:'Magister — voorlopige versie'})).toBeVisible();await expect(page.getByRole('link',{name:'Toch downloaden'})).toHaveAttribute('href',/releases\/latest\/download\/CijferReveal-Magister.zip$/);await page.getByRole('button',{name:'Annuleren'}).click();await expect(trigger).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Escape');await trigger.click();await expect(som).toBeVisible();
});

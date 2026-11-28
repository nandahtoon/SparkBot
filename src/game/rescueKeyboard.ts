import type {RescueAction} from './rescueAdventure';
export function rescueKeyboardAction(key:string):RescueAction|null{
 switch(key){case 'ArrowUp':return 'up';case 'ArrowRight':return 'right';case 'ArrowDown':return 'down';case 'ArrowLeft':return 'left';case 'r':case 'R':return 'repair';default:return null;}
}

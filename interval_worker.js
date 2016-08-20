var interval;

addEventListener('message',function(e){
	interval = e.data; //set interval on message
	trigger();
});

function trigger(){
	postMessage(0); //trigger a direction change
	setTimeout(trigger, interval); //queue the next one
}
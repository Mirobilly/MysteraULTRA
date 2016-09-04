var interval = 0;

addEventListener('message',function(e){
	interval = e.data; //set interval on message
	trigger();
});

function trigger(){
	if(interval>0){
		postMessage(0); //trigger a direction change
		setTimeout(trigger, interval); //queue the next one
	}
}
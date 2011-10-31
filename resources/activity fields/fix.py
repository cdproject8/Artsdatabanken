import os
	
	
lines = "<option value=""></option>\\n"
with open("act") as f:
	for line in f:
		lines += '<option value="'+line[:-1]+'">'+line[:-1]+'</option>\\n'
		
print lines

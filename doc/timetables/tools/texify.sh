#!/bin/bash

if [ -z "$1" ]; then echo "Missing CSV filename"; fi

get_line() {
# params: filename, line number
	echo `head -n $2 $1 | tail -n 1`
}

count_cols() {
# params: filename, line number
	get_line $1 $2 | sed -e 's/[^,]//g'| wc -L
}

get_col_str() {
# params: filename
	local max=`count_cols $1 3`
	local str=""
	for (( i=0; i<=$max; i++)); do
		str="$str| l "
	done;
	echo "$str|"
}

get_row() {
#params: filename line
	echo "`get_line $1 $2 | sed -e 's/,/ \\\\\& /g' | tr -d '"'` \\\\\\\\"
}

group="`get_line $1 1 | sed -e 's/^.*,//g' | tr -d '"'`"
date="`get_line $1 2 | sed -e 's/^.*,//g' | tr -d '"'`"
colspec="`get_col_str $1`"
titles="`get_row $1 3`"
let rowcount=`cat $1 | wc --lines`
rows=""
for (( i=4; i<=$rowcount; i++)); do
	rows="$rows\n`get_row $1 $i`"
done;

cat tools/tex/timetable.tex | sed \
	-e "s#%group%#$group#g" \
	-e "s#%date%#$date#g" \
	-e "s#%colspec%#$colspec#g" \
	-e "s#%titles%#$titles#g" \
	-e "s#%rows%#$rows#g"

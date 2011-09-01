#!/bin/bash

# Config

GROUP=8

# End of config

print_summary() {
	print_row "Activity_/_Period $weeks Activity_sums"

	for row_name in `get_row_names`; do
		local formatted_name=`echo $row_name | sed -e 's/^w_//g' -e 's/_/ /g'`
		echo -n \"${formatted_name^}\",
		row=`eval echo '${'$row_name[*]'}'`

		actual_name="$row_name"
		expected_name=`echo "$actual_name" | sed 's/^w_/w_exp_/'`
		merged_row=`merge_rows "$expected_name" "$actual_name"`

		expected_row=`eval echo '${'$expected_name[*]'}'`
		print_row "$merged_row E:`calc_sum "$expected_row"`_A:`calc_sum "$row"`"
	done;
}

print_row() {
	{
		for col in $1; do
			echo -n \"$col\",
		done
	} | sed -e 's/,$//' -e 's/_/ /g'
	echo
}

merge_rows() {
	expected=( `eval echo '${'$1[*]'}'` )
	actual=( `eval echo '${'$2[*]'}'` )
	expected_sum=0
	actual_sum=0
	for i in ${!actual[*]}; do
		if [ -z "${expected[$i]}" ]; then 
			expected[$i]=0
		fi
		let expected_sum+=${expected[$i]}
		let actual_sum+=${actual[$i]}
		echo E:${expected[$i]}/${expected_sum}_A:${actual[$i]}/$actual_sum
	done
}

calc_sum() {
	local total=0
	for i in $1; do
		((total += $i))
	done;
	echo $total
}

calc_week() {
# Populate $w_*

	# Expected values

	source $1/expected.sh
	w_exp_period_sum[$1]=0
	for i in ${!expected_*}; do
		w_exp_period_sum[$1]=$((${w_exp_period_sum[$1]} + $i))
		local tmp=`echo $i | sed 's/expected_//g'`[$1]
		let w_exp_$tmp=$i
	done
	unset ${!expected_*}

	# User recorded values

	local sum total count
	for i in `ls "$1" | grep ^reg_ | tr "\n" " "`; do
		source "$1/$i"
		count=0
		for activity in ${!reg_*}; do
			local activity_name=`echo $activity | sed 's/reg_//g'`
			local activity_value=`eval echo '$'$activity`;
			let w_$activity_name[$1]+=$activity_value
			let sum[$count]+=$activity_value # hack..
			let count+=$count
			unset `eval echo $activity`
		done
	done;

	for i in ${sum[*]}; do
		w_period_sum[$1]=$((${period_sum[$1]} + $i))
	done
}

calc_weeks () {
# Populate $weeks
	weeks=`ls | grep ^[0-9][0-9]$`
	for week in $weeks ; do
		calc_week $week
	done
}

print_header() {
	echo \"Group no\",\"$GROUP\"
	echo \"Date\",\"`date`\"
}

get_row_names() {
	for i in ${!w_*}; do
		echo $i | grep -v w_period_sum | grep -v ^w_exp_ | tr "\n" " "
	done;
	echo w_period_sum
}

calc_weeks
print_header
print_summary

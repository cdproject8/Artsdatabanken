/^[[:space:]]*Output written/{
  s/.*(\([^)]\{1,\}\)).*/Success!  Wrote \1/
  s/[[:digit:]]\{1,\}/[1m&(B[m/g
  s/Success!/[1m&(B[m/g
  p
  b end
}
/([^ (]*\.tex[^(]*([^ (]*\.tex/{
  s/.*(\([^ (]*\.tex\)\([^(]*\)\(([^ (]*\.tex\)/[1m\1(B[m\
\3/
  P
  D
}
/([^ (]*\.tex/{
  s/.*(\([^ (]*\.tex\)$/[1m\1(B[m\
/
  s/.*(\([^ (]*\.tex\)[ )]/[1m\1(B[m\
/
  P
  D
}
s/^! *LaTeX Error:.*/[31m[1m&(B[m/p
t
/^LaTeX Warning:.*/b warningloop
/^Underfull.*/b hbox
/^Overfull.*/b hbox
/^\#\#\#.*/b warningloop
b end

: hbox
  s/.*/[31m&(B[m/p
  b end

: warningloop
  N
  s/\(.*\n\)$/&/
  t warningdone
  b warningloop
: warningdone
  s/.*/[31m&(B[m/p

: end
d
